"use server"

import { revalidatePath } from "next/cache"
import { createAdminClient, createClient } from "@/lib/db/server"

async function auth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

async function checkMembership(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, orgId: string) {
  const { data } = await supabase.from("org_members").select("role").eq("user_id", userId).eq("org_id", orgId).single()
  return data
}

function generateSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

function revalidate() {
  revalidatePath("/", "layout")
}

// --- Objectives ---

export async function createObjective(payload: unknown, orgId: string) {
  const { createObjectiveSchema } = await import("@/lib/types")
  const parsed = createObjectiveSchema.safeParse(payload)
  if (!parsed.success) return { error: parsed.error.errors.map((e) => e.message).join(", ") }

  const { supabase, user } = await auth()
  if (!user) return { error: "Not authenticated" }
  if (!(await checkMembership(supabase, user.id, orgId))) return { error: "Not authorized" }

  const { title, description, endDate, keyResults } = parsed.data

  const { data: objective, error } = await supabase
    .from("objectives")
    .insert({ user_id: user.id, org_id: orgId, title, description: description || null, end_date: endDate })
    .select()
    .single()

  if (error || !objective) return { error: error?.message || "Failed to create" }

  if (keyResults.length > 0) {
    const { data: krs, error: krError } = await supabase
      .from("key_results")
      .insert(
        keyResults.map((kr) => ({
          objective_id: objective.id,
          title: kr.title,
          target_value: kr.targetValue,
          current_value: kr.startValue || 0,
          unit: kr.unit,
        }))
      )
      .select()

    if (krError) return { error: krError.message }

    if (krs) {
      const updates = krs
        .filter((kr: any) => kr.current_value !== 0)
        .map((kr: any) => ({
          key_result_id: kr.id,
          previous_value: 0,
          new_value: kr.current_value,
          note: "Initial value",
        }))
      if (updates.length > 0) await supabase.from("progress_updates").insert(updates)
    }
  }

  revalidate()
  return { data: objective }
}

export async function updateObjective(
  payload: {
    id: string
    title: string
    description: string
    endDate: string
    keyResults: { id: string; title: string; targetValue: number; unit: string; startValue: number }[]
  },
  orgId: string
) {
  const { supabase, user } = await auth()
  if (!user) return { error: "Not authenticated" }
  if (!(await checkMembership(supabase, user.id, orgId))) return { error: "Not authorized" }

  const { id, title, description, endDate, keyResults } = payload

  const { error } = await supabase
    .from("objectives")
    .update({ title, description: description || null, end_date: endDate, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", orgId)

  if (error) return { error: error.message }

  await supabase.from("key_results").delete().eq("objective_id", id)

  if (keyResults.length > 0) {
    const { error: krError } = await supabase.from("key_results").insert(
      keyResults.map((kr) => ({
        objective_id: id,
        title: kr.title,
        target_value: kr.targetValue,
        current_value: kr.startValue || 0,
        unit: kr.unit,
      }))
    )
    if (krError) return { error: krError.message }
  }

  revalidate()
  return { success: true }
}

export async function updateProgress(keyResultId: string, newValue: number, orgId: string, note?: string) {
  const { supabase, user } = await auth()
  if (!user) return { error: "Not authenticated" }
  if (!(await checkMembership(supabase, user.id, orgId))) return { error: "Not authorized" }

  const { data: kr, error: fetchError } = await supabase
    .from("key_results")
    .select("current_value, objectives!inner(org_id)")
    .eq("id", keyResultId)
    .single()

  if (fetchError || !kr) return { error: fetchError?.message || "Key result not found" }
  if ((kr as any).objectives?.org_id !== orgId) return { error: "Not found in this organization" }

  const { error: progressError } = await supabase
    .from("progress_updates")
    .insert({ key_result_id: keyResultId, previous_value: kr.current_value, new_value: newValue, note: note || null })

  if (progressError) return { error: progressError.message }

  const { error } = await supabase
    .from("key_results")
    .update({ current_value: newValue, updated_at: new Date().toISOString() })
    .eq("id", keyResultId)

  if (error) return { error: error.message }

  revalidate()
  return { success: true }
}

export async function deleteObjective(objectiveId: string, orgId: string) {
  const { supabase, user } = await auth()
  if (!user) return { error: "Not authenticated" }

  const m = await checkMembership(supabase, user.id, orgId)
  if (!m || (m.role !== "owner" && m.role !== "admin")) return { error: "Only owners and admins can delete" }

  const { error } = await supabase.from("objectives").delete().eq("id", objectiveId).eq("org_id", orgId)
  if (error) return { error: error.message }

  revalidate()
  return { success: true }
}

// --- Organizations ---

export async function generateOrg() {
  const { user } = await auth()
  if (!user?.email) return { error: "Not authenticated" }

  const uuid = Math.random().toString(36).substring(2, 8)
  const words = ["spark", "forge", "pulse", "nexus", "orbit", "flux", "apex", "nova", "bolt", "wave"]
  const name = `${uuid}-${words[Math.floor(Math.random() * words.length)]}`
  const slug = name

  const admin = createAdminClient()

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name, slug, domain: null, auto_join_domain: false, created_by: user.id })
    .select()
    .single()

  if (orgError) return { error: orgError.message }

  const { error: memberError } = await admin
    .from("org_members")
    .insert({ org_id: org.id, user_id: user.id, role: "owner" })
  if (memberError) return { error: memberError.message }

  return { data: org }
}

export async function updateOrg(
  orgId: string,
  settings: { name?: string; auto_join_domain?: boolean; domain?: string | null }
) {
  const { user } = await auth()
  if (!user) return { error: "Not authenticated" }

  const admin = createAdminClient()
  const m = await checkMembership(admin as any, user.id, orgId)
  if (!m || (m.role !== "owner" && m.role !== "admin")) return { error: "Not authorized" }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  let newSlug: string | undefined

  if (settings.name) {
    updates.name = settings.name
    newSlug = generateSlug(settings.name)
    if (newSlug.length < 2) return { error: "Organization name is too short" }

    // Check if slug is already taken by another org
    const { data: existing } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", newSlug)
      .neq("id", orgId)
      .single()
    if (existing) return { error: "An organization with this name already exists" }

    updates.slug = newSlug
  }

  if (settings.auto_join_domain !== undefined) updates.auto_join_domain = settings.auto_join_domain
  if (settings.domain !== undefined) updates.domain = settings.domain

  const { error } = await admin.from("organizations").update(updates).eq("id", orgId)
  if (error) return { error: error.message }

  revalidate()
  return { success: true, slug: newSlug }
}

// --- Members ---

export async function getMembers(orgId: string) {
  const { supabase, user } = await auth()
  if (!user) return []
  if (!(await checkMembership(supabase, user.id, orgId))) return []

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("org_members")
    .select("*")
    .eq("org_id", orgId)
    .order("joined_at", { ascending: true })
  if (error) return []

  return Promise.all(
    data.map(async (m) => {
      const { data: u } = await admin.auth.admin.getUserById(m.user_id)
      return {
        ...m,
        user_email: u?.user?.email,
        user_name: u?.user?.user_metadata?.full_name || u?.user?.user_metadata?.name,
      }
    })
  )
}

export async function removeMember(orgId: string, memberId: string) {
  const { supabase, user } = await auth()
  if (!user) return { error: "Not authenticated" }

  const m = await checkMembership(supabase, user.id, orgId)
  if (!m || (m.role !== "owner" && m.role !== "admin")) return { error: "Not authorized" }

  const { data: target } = await supabase
    .from("org_members")
    .select("role")
    .eq("id", memberId)
    .eq("org_id", orgId)
    .single()
  if (!target) return { error: "Member not found" }
  if (target.role === "owner") return { error: "Cannot remove owner" }
  if (m.role === "admin" && target.role === "admin") return { error: "Admins cannot remove other admins" }

  const { error } = await supabase.from("org_members").delete().eq("id", memberId).eq("org_id", orgId)
  if (error) return { error: error.message }

  revalidate()
  return { success: true }
}

export async function renameMember(orgId: string, memberId: string, displayName: string) {
  const { user } = await auth()
  if (!user) return { error: "Not authenticated" }

  const admin = createAdminClient()
  const m = await checkMembership(admin as any, user.id, orgId)
  if (!m || (m.role !== "owner" && m.role !== "admin")) return { error: "Not authorized" }

  const { data: target } = await admin
    .from("org_members")
    .select("user_id")
    .eq("id", memberId)
    .eq("org_id", orgId)
    .single()
  if (!target) return { error: "Member not found" }

  const { error } = await admin.auth.admin.updateUserById(target.user_id, { user_metadata: { full_name: displayName } })
  if (error) return { error: error.message }

  revalidate()
  return { success: true }
}

export async function setMemberRole(orgId: string, memberId: string, newRole: "owner" | "admin" | "member") {
  const { user } = await auth()
  if (!user) return { error: "Not authenticated" }

  const admin = createAdminClient()
  const m = await checkMembership(admin as any, user.id, orgId)
  if (!m || (m.role !== "owner" && m.role !== "admin")) return { error: "Not authorized" }

  const { data: target } = await admin
    .from("org_members")
    .select("role")
    .eq("id", memberId)
    .eq("org_id", orgId)
    .single()
  if (!target) return { error: "Member not found" }

  if ((newRole === "owner" || target.role === "owner") && m.role !== "owner")
    return { error: "Only owners can change owner roles" }

  if (target.role === "owner" && newRole !== "owner") {
    const { count } = await admin
      .from("org_members")
      .select("*", { count: "exact", head: true })
      .eq("org_id", orgId)
      .eq("role", "owner")
    if (count && count <= 1) return { error: "Cannot demote last owner" }
  }

  if (m.role === "admin" && target.role === "admin") return { error: "Admins cannot change other admins" }

  const { error } = await admin.from("org_members").update({ role: newRole }).eq("id", memberId)
  if (error) return { error: error.message }

  revalidate()
  return { success: true }
}

export async function transferOwnership(orgId: string, memberId: string) {
  const { user } = await auth()
  if (!user) return { error: "Not authenticated" }

  const admin = createAdminClient()

  const { data: current } = await admin
    .from("org_members")
    .select("id, role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single()
  if (!current || current.role !== "owner") return { error: "Only owner can transfer" }

  const { data: target } = await admin
    .from("org_members")
    .select("role")
    .eq("id", memberId)
    .eq("org_id", orgId)
    .single()
  if (!target) return { error: "Member not found" }
  if (target.role === "owner") return { error: "Already owner" }

  const { error: e1 } = await admin.from("org_members").update({ role: "owner" }).eq("id", memberId)
  if (e1) return { error: e1.message }

  const { error: e2 } = await admin.from("org_members").update({ role: "admin" }).eq("id", current.id)
  if (e2) return { error: e2.message }

  revalidate()
  return { success: true }
}

// --- Invites ---

export async function getInvites(orgId: string) {
  const { supabase, user } = await auth()
  if (!user) return []

  const m = await checkMembership(supabase, user.id, orgId)
  if (!m || (m.role !== "owner" && m.role !== "admin")) return []

  const { data } = await supabase
    .from("org_invites")
    .select("*")
    .eq("org_id", orgId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })

  return data || []
}

export async function generateInviteLink(orgId: string, inviteRole: "owner" | "admin" | "member" = "member") {
  const { supabase, user } = await auth()
  if (!user) return { error: "Not authenticated" }

  const m = await checkMembership(supabase, user.id, orgId)
  if (!m || (m.role !== "owner" && m.role !== "admin")) return { error: "Not authorized" }
  if (inviteRole === "owner" && m.role !== "owner") return { error: "Only owners can create owner invites" }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  // Use a placeholder email for link-based invites
  const placeholderEmail = `invite-${Date.now()}@link.okrs.dev`

  const { data, error } = await supabase
    .from("org_invites")
    .insert({
      org_id: orgId,
      email: placeholderEmail,
      role: inviteRole,
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select("token")
    .single()

  if (error) return { error: error.message }

  revalidate()
  return { token: data.token }
}

export async function sendInvite(orgId: string, email: string, inviteRole: "owner" | "admin" | "member" = "member") {
  const { supabase, user } = await auth()
  if (!user) return { error: "Not authenticated" }

  const { data: m } = await supabase
    .from("org_members")
    .select("role, organizations(name)")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single()

  if (!m || (m.role !== "owner" && m.role !== "admin")) return { error: "Not authorized" }
  if (inviteRole === "owner" && m.role !== "owner") return { error: "Only owners can invite owners" }

  const { data: existing } = await supabase
    .from("org_invites")
    .select("id")
    .eq("org_id", orgId)
    .eq("email", email.toLowerCase())
    .gt("expires_at", new Date().toISOString())
    .single()

  if (existing) return { error: "Invite already exists" }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data, error } = await supabase
    .from("org_invites")
    .insert({
      org_id: orgId,
      email: email.toLowerCase(),
      role: inviteRole,
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select("*, organizations(name)")
    .single()

  if (error) return { error: error.message }

  const orgName = (data.organizations as any)?.name || "an organization"
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://okrs.dev"}/invite/${data.token}`

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "OKR <noreply@okrs.dev>",
      to: email.toLowerCase(),
      subject: `Join ${orgName} on OKRs`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 48px 40px; text-align: center;">
                      <img src="${process.env.NEXT_PUBLIC_APP_URL || "https://okrs.dev"}/icon.png" alt="OKRs" width="48" height="48" style="width: 48px; height: 48px; margin: 0 auto 24px; display: block;" />
                      <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 600; color: #18181b;">Join ${orgName}</h1>
                      <p style="margin: 0 0 32px; font-size: 15px; color: #71717a; line-height: 1.5;">
                        ${user.email} invited you to collaborate on OKRs
                      </p>
                      <a href="${inviteUrl}" style="display: inline-block; background-color: #18181b; color: #ffffff; padding: 14px 32px; text-decoration: none; font-size: 14px; font-weight: 500;">Accept Invitation</a>
                      <p style="margin: 32px 0 0; font-size: 12px; color: #a1a1aa;">
                        Expires in 7 days
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #f4f4f5;">
                      <p style="margin: 0; font-size: 11px; color: #a1a1aa; text-align: center; word-break: break-all;">
                        ${inviteUrl}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    })
  } catch (e) {
    console.error("Failed to send invite email:", e)
  }

  revalidate()
  return { data }
}

export async function acceptInvite(token: string) {
  const { supabase, user } = await auth()
  if (!user?.email) return { error: "Not authenticated" }

  // Find invite by token only - the token itself is the secret
  const { data: inv } = await supabase
    .from("org_invites")
    .select("*")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .single()

  if (!inv) return { error: "Invalid or expired invite" }

  // Warn if email doesn't match but still allow (token is the auth)
  if (inv.email.toLowerCase() !== user.email.toLowerCase()) {
    console.log(`[acceptInvite] Email mismatch: invited ${inv.email}, accepting ${user.email}`)
  }

  const { data: existing } = await supabase
    .from("org_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("org_id", inv.org_id)
    .single()

  if (existing) {
    await supabase.from("org_invites").delete().eq("id", inv.id)
    return { success: true }
  }

  const { error } = await supabase.from("org_members").insert({ org_id: inv.org_id, user_id: user.id, role: inv.role })
  if (error) return { error: error.message }

  await supabase.from("org_invites").delete().eq("id", inv.id)

  revalidate()
  return { success: true }
}

export async function cancelInvite(orgId: string, inviteId: string) {
  const { supabase, user } = await auth()
  if (!user) return { error: "Not authenticated" }

  const m = await checkMembership(supabase, user.id, orgId)
  if (!m || (m.role !== "owner" && m.role !== "admin")) return { error: "Not authorized" }

  const { error } = await supabase.from("org_invites").delete().eq("id", inviteId).eq("org_id", orgId)
  if (error) return { error: error.message }

  revalidate()
  return { success: true }
}

export async function resendInvite(orgId: string, inviteId: string) {
  const { supabase, user } = await auth()
  if (!user) return { error: "Not authenticated" }

  const m = await checkMembership(supabase, user.id, orgId)
  if (!m || (m.role !== "owner" && m.role !== "admin")) return { error: "Not authorized" }

  const { data: invite } = await supabase
    .from("org_invites")
    .select("*, organizations(name)")
    .eq("id", inviteId)
    .eq("org_id", orgId)
    .single()

  if (!invite) return { error: "Invite not found" }

  // Extend expiry
  const newExpiry = new Date()
  newExpiry.setDate(newExpiry.getDate() + 7)
  await supabase.from("org_invites").update({ expires_at: newExpiry.toISOString() }).eq("id", inviteId)

  const orgName = (invite.organizations as { name: string })?.name || "the organization"
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://okrs.dev"}/invite/${invite.token}`

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "OKR <noreply@okrs.dev>",
      to: invite.email,
      subject: `Reminder: Join ${orgName} on OKRs`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background-color: #ffffff; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="padding: 48px 40px; text-align: center;">
                      <img src="${process.env.NEXT_PUBLIC_APP_URL || "https://okrs.dev"}/icon.png" alt="OKRs" width="48" height="48" style="width: 48px; height: 48px; margin: 0 auto 24px; display: block;" />
                      <h1 style="margin: 0 0 8px; font-size: 24px; font-weight: 600; color: #18181b;">Join ${orgName}</h1>
                      <p style="margin: 0 0 32px; font-size: 15px; color: #71717a; line-height: 1.5;">
                        ${user.email} is still waiting for you to join
                      </p>
                      <a href="${inviteUrl}" style="display: inline-block; background-color: #18181b; color: #ffffff; padding: 14px 32px; text-decoration: none; font-size: 14px; font-weight: 500;">Accept Invitation</a>
                      <p style="margin: 32px 0 0; font-size: 12px; color: #a1a1aa;">
                        Expires in 7 days
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 24px 40px; background-color: #fafafa; border-top: 1px solid #f4f4f5;">
                      <p style="margin: 0; font-size: 11px; color: #a1a1aa; text-align: center; word-break: break-all;">
                        ${inviteUrl}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    })
  } catch (e) {
    console.error("Failed to resend invite email:", e)
    return { error: "Failed to send email" }
  }

  revalidate()
  return { success: true }
}

export async function updateInviteRole(orgId: string, inviteId: string, newRole: "owner" | "admin" | "member") {
  const { supabase, user } = await auth()
  if (!user) return { error: "Not authenticated" }

  const m = await checkMembership(supabase, user.id, orgId)
  if (!m || (m.role !== "owner" && m.role !== "admin")) return { error: "Not authorized" }

  const { error } = await supabase
    .from("org_invites")
    .update({ role: newRole })
    .eq("id", inviteId)
    .eq("org_id", orgId)
  if (error) return { error: error.message }

  revalidate()
  return { success: true }
}

export async function deleteOrg(orgId: string) {
  "use server"
  const { supabase, user } = await auth()
  if (!user) return { error: "Not authenticated" }

  const m = await checkMembership(supabase, user.id, orgId)
  if (!m || m.role !== "owner") return { error: "Only the owner can delete the organization" }

  // Delete the organization - all related data (members, invites, objectives,
  // key_results, progress_updates) will cascade automatically via foreign keys
  const { error } = await supabase.from("organizations").delete().eq("id", orgId)
  if (error) return { error: error.message }

  revalidate()
  return { success: true }
}
