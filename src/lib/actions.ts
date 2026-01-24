"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/db/server"

export async function createObjectiveWithKeyResults(payload: unknown, orgId: string) {
  const { createObjectiveSchema } = await import("@/lib/types")

  // Validate with Zod
  const parsed = createObjectiveSchema.safeParse(payload)
  if (!parsed.success) {
    return { error: parsed.error.errors.map((e) => e.message).join(", ") }
  }

  const { title, description, endDate, keyResults } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Create objective
  const { data: objective, error: objError } = await supabase
    .from("objectives")
    .insert({
      user_id: user.id,
      org_id: orgId,
      title,
      description: description || null,
      end_date: endDate,
    })
    .select()
    .single()

  if (objError || !objective) {
    return { error: objError?.message || "Failed to create objective" }
  }

  // Create key results
  if (keyResults.length > 0) {
    const krsToInsert = keyResults.map((kr) => ({
      objective_id: objective.id,
      title: kr.title,
      target_value: kr.targetValue,
      current_value: kr.startValue || 0,
      unit: kr.unit,
    }))

    const { data: createdKrs, error: krError } = await supabase.from("key_results").insert(krsToInsert).select()

    if (krError) {
      return { error: krError.message }
    }

    // Create initial progress_updates for KRs with non-zero start values
    if (createdKrs) {
      const initialUpdates = createdKrs
        .filter((kr: any) => kr.current_value !== 0)
        .map((kr: any) => ({
          key_result_id: kr.id,
          previous_value: 0,
          new_value: kr.current_value,
          note: "Initial value",
        }))

      if (initialUpdates.length > 0) {
        await supabase.from("progress_updates").insert(initialUpdates)
      }
    }
  }

  revalidatePath("/", "layout")
  return { data: objective }
}

export async function updateObjectiveWithKeyResults(
  payload: {
    id: string
    title: string
    description: string
    endDate: string
    keyResults: { id: string; title: string; targetValue: number; unit: string; startValue: number }[]
  },
  orgId: string
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Verify user is member of the org
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single()

  if (!membership) {
    return { error: "Not authorized for this organization" }
  }

  const { id, title, description, endDate, keyResults } = payload

  // Update objective - only if it belongs to this org
  const { error: objError } = await supabase
    .from("objectives")
    .update({
      title,
      description: description || null,
      end_date: endDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("org_id", orgId)

  if (objError) {
    return { error: objError.message }
  }

  // Update key results - delete existing and insert new ones
  await supabase.from("key_results").delete().eq("objective_id", id)

  if (keyResults.length > 0) {
    const krsToInsert = keyResults.map((kr) => ({
      objective_id: id,
      title: kr.title,
      target_value: kr.targetValue,
      current_value: kr.startValue || 0,
      unit: kr.unit,
    }))

    const { error: krError } = await supabase.from("key_results").insert(krsToInsert)

    if (krError) {
      return { error: krError.message }
    }
  }

  revalidatePath("/", "layout")
  return { success: true }
}

export async function updateKeyResultProgress(keyResultId: string, newValue: number, orgId: string, note?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Verify user is member of the org
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single()

  if (!membership) {
    return { error: "Not authorized for this organization" }
  }

  // Get key result and verify it belongs to an objective in this org
  const { data: keyResult, error: fetchError } = await supabase
    .from("key_results")
    .select("current_value, objectives!inner(org_id)")
    .eq("id", keyResultId)
    .single()

  if (fetchError) {
    console.error("Failed to fetch key result:", fetchError)
    return { error: `Failed to fetch key result: ${fetchError.message}` }
  }

  if (!keyResult) {
    return { error: "Key result not found" }
  }

  // Verify the key result's objective belongs to this org
  if ((keyResult as any).objectives?.org_id !== orgId) {
    return { error: "Key result not found in this organization" }
  }

  console.log("Creating progress update:", { keyResultId, previous: keyResult.current_value, new: newValue, note })

  // Create progress update
  const { data: progressData, error: progressError } = await supabase
    .from("progress_updates")
    .insert({
      key_result_id: keyResultId,
      previous_value: keyResult.current_value,
      new_value: newValue,
      note: note || null,
    })
    .select()

  if (progressError) {
    console.error("Failed to create progress update:", progressError)
    return { error: `Failed to save progress: ${progressError.message}` }
  }

  console.log("Progress update created:", progressData)

  // Update current value
  const { error } = await supabase
    .from("key_results")
    .update({ current_value: newValue, updated_at: new Date().toISOString() })
    .eq("id", keyResultId)

  if (error) {
    console.error("Failed to update key result:", error)
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  return { success: true }
}

export async function deleteObjective(objectiveId: string, orgId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Verify user is member of the org with admin/owner role
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .single()

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return { error: "Only owners and admins can delete objectives" }
  }

  // Delete objective only if it belongs to this org
  const { error } = await supabase.from("objectives").delete().eq("id", objectiveId).eq("org_id", orgId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  return { success: true }
}

// Common email providers that shouldn't be used for domain auto-join
const PUBLIC_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "live.com",
  "msn.com",
  "aol.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "protonmail.com",
  "proton.me",
  "zoho.com",
  "yandex.com",
  "mail.com",
  "gmx.com",
  "gmx.net",
]

export async function createOrganization(name: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { error: "Not authenticated" }
  }

  const emailDomain = user.email.split("@")[1].toLowerCase()
  // Don't auto-set domain for public email providers
  const domain = PUBLIC_EMAIL_DOMAINS.includes(emailDomain) ? null : emailDomain
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

  // Use admin client to bypass RLS for org creation
  const { createAdminClient } = await import("@/lib/db/server")
  const adminClient = createAdminClient()

  const { data: org, error: orgError } = await adminClient
    .from("organizations")
    .insert({
      name,
      slug,
      domain,
      auto_join_domain: !!domain,
      created_by: user.id,
    })
    .select()
    .single()

  if (orgError) {
    return { error: orgError.message }
  }

  // Add creator as owner
  const { error: memberError } = await adminClient.from("org_members").insert({
    org_id: org.id,
    user_id: user.id,
    role: "owner",
  })

  if (memberError) {
    return { error: memberError.message }
  }

  // Note: Don't call revalidatePath here as this may be called during render
  // The redirect after org creation will load fresh data anyway
  return { data: org }
}

async function generateOrgName(): Promise<string> {
  const uuid = Math.random().toString(36).substring(2, 8)

  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error("No API key")
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You generate ONE creative, fun, memorable single word. Output ONLY the word, nothing else.",
          },
          {
            role: "user",
            content:
              "Generate ONE creative word for an organization name. Examples: Moonshot, Nebula, Catalyst, Quantum, Vertex, Forge, Spark, Horizon, Prism, Flux. Output just the word.",
          },
        ],
        max_tokens: 20,
      }),
    })

    if (!response.ok) throw new Error("API error")

    const data = await response.json()
    const word =
      data.choices[0]?.message?.content
        ?.trim()
        .toLowerCase()
        .replace(/[^a-z]/g, "") || "spark"
    return `${uuid}-${word}`
  } catch {
    const fallbackWords = ["spark", "forge", "pulse", "nexus", "orbit", "flux", "apex", "nova", "bolt", "wave"]
    const fallbackWord = fallbackWords[Math.floor(Math.random() * fallbackWords.length)]
    return `${uuid}-${fallbackWord}`
  }
}

export async function generateAndCreateOrg() {
  const name = await generateOrgName()
  return createOrganization(name)
}

export async function getOrgMembers(orgId: string) {
  const { createAdminClient } = await import("@/lib/db/server")
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from("org_members")
    .select("*")
    .eq("org_id", orgId)
    .order("joined_at", { ascending: true })

  if (error) return []

  // Get user emails from auth.users using admin client
  const membersWithEmails = await Promise.all(
    data.map(async (member) => {
      const { data: userData } = await adminClient.auth.admin.getUserById(member.user_id)
      return {
        ...member,
        user_email: userData?.user?.email || undefined,
        user_name: userData?.user?.user_metadata?.full_name || userData?.user?.user_metadata?.name || undefined,
      }
    })
  )

  return membersWithEmails
}

export async function getOrgInvites(orgId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("org_invites")
    .select("*")
    .eq("org_id", orgId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })

  if (error) return []
  return data
}

export async function inviteToOrg(email: string, role: "owner" | "admin" | "member" = "member") {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get user's org and check if they're admin/owner
  const { data: membership } = await supabase.from("org_members").select("org_id, role").eq("user_id", user.id).single()

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return { error: "You don't have permission to invite members" }
  }

  // Only owners can invite as owner
  if (role === "owner" && membership.role !== "owner") {
    return { error: "Only owners can invite new owners" }
  }

  // Check if invite already exists
  const { data: existingInvite } = await supabase
    .from("org_invites")
    .select("id")
    .eq("org_id", membership.org_id)
    .eq("email", email.toLowerCase())
    .gt("expires_at", new Date().toISOString())
    .single()

  if (existingInvite) {
    return { error: "An invite for this email already exists" }
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 day expiry

  const { data, error } = await supabase
    .from("org_invites")
    .insert({
      org_id: membership.org_id,
      email: email.toLowerCase(),
      role,
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  return { data }
}

export async function acceptInvite(inviteId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { error: "Not authenticated" }
  }

  // Get invite
  const { data: invite } = await supabase
    .from("org_invites")
    .select("*")
    .eq("id", inviteId)
    .eq("email", user.email.toLowerCase())
    .gt("expires_at", new Date().toISOString())
    .single()

  if (!invite) {
    return { error: "Invalid or expired invite" }
  }

  // Check if already a member of any org
  const { data: existingMembership } = await supabase.from("org_members").select("id").eq("user_id", user.id).single()

  if (existingMembership) {
    return { error: "You are already part of an organization" }
  }

  // Add as member
  const { error: memberError } = await supabase.from("org_members").insert({
    org_id: invite.org_id,
    user_id: user.id,
    role: invite.role,
  })

  if (memberError) {
    return { error: memberError.message }
  }

  // Delete invite
  await supabase.from("org_invites").delete().eq("id", inviteId)

  revalidatePath("/", "layout")
  return { success: true }
}

export async function removeOrgMember(memberId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get user's org and check if they're admin/owner
  const { data: membership } = await supabase.from("org_members").select("org_id, role").eq("user_id", user.id).single()

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return { error: "You don't have permission to remove members" }
  }

  // Get target member
  const { data: targetMember } = await supabase
    .from("org_members")
    .select("role, user_id")
    .eq("id", memberId)
    .eq("org_id", membership.org_id)
    .single()

  if (!targetMember) {
    return { error: "Member not found" }
  }

  // Can't remove owner
  if (targetMember.role === "owner") {
    return { error: "Cannot remove the organization owner" }
  }

  // Admin can't remove other admins
  if (membership.role === "admin" && targetMember.role === "admin") {
    return { error: "Admins cannot remove other admins" }
  }

  const { error } = await supabase.from("org_members").delete().eq("id", memberId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  return { success: true }
}

export async function cancelInvite(inviteId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get user's org
  const { data: membership } = await supabase.from("org_members").select("org_id, role").eq("user_id", user.id).single()

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return { error: "You don't have permission to cancel invites" }
  }

  const { error } = await supabase.from("org_invites").delete().eq("id", inviteId).eq("org_id", membership.org_id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  return { success: true }
}

export async function updateMemberName(memberId: string, displayName: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Use admin client to bypass RLS
  const { createAdminClient } = await import("@/lib/db/server")
  const adminClient = createAdminClient()

  const { data: membership } = await adminClient
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single()

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return { error: "You don't have permission to update member names" }
  }

  // Get target member's user_id
  const { data: targetMember } = await adminClient
    .from("org_members")
    .select("user_id")
    .eq("id", memberId)
    .eq("org_id", membership.org_id)
    .single()

  if (!targetMember) {
    return { error: "Member not found" }
  }

  // Update user metadata with display name
  const { error } = await adminClient.auth.admin.updateUserById(targetMember.user_id, {
    user_metadata: { full_name: displayName },
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  return { success: true }
}

export async function transferOwnership(memberId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const { createAdminClient } = await import("@/lib/db/server")
  const adminClient = createAdminClient()

  // Check current user is the owner
  const { data: currentMembership } = await adminClient
    .from("org_members")
    .select("id, org_id, role")
    .eq("user_id", user.id)
    .single()

  if (!currentMembership || currentMembership.role !== "owner") {
    return { error: "Only the owner can transfer ownership" }
  }

  // Get the target member
  const { data: targetMember } = await adminClient
    .from("org_members")
    .select("id, role")
    .eq("id", memberId)
    .eq("org_id", currentMembership.org_id)
    .single()

  if (!targetMember) {
    return { error: "Member not found" }
  }

  if (targetMember.role === "owner") {
    return { error: "This member is already the owner" }
  }

  // Transfer ownership: make target owner, make current user admin
  const { error: targetError } = await adminClient.from("org_members").update({ role: "owner" }).eq("id", memberId)

  if (targetError) {
    return { error: targetError.message }
  }

  const { error: currentError } = await adminClient
    .from("org_members")
    .update({ role: "admin" })
    .eq("id", currentMembership.id)

  if (currentError) {
    return { error: currentError.message }
  }

  revalidatePath("/", "layout")
  return { success: true }
}

export async function updateMemberRole(memberId: string, newRole: "owner" | "admin" | "member") {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Use admin client to bypass RLS
  const { createAdminClient } = await import("@/lib/db/server")
  const adminClient = createAdminClient()

  const { data: membership } = await adminClient
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single()

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return { error: "You don't have permission to update member roles" }
  }

  // Get target member
  const { data: targetMember } = await adminClient
    .from("org_members")
    .select("role, user_id")
    .eq("id", memberId)
    .eq("org_id", membership.org_id)
    .single()

  if (!targetMember) {
    return { error: "Member not found" }
  }

  // Only owners can promote to owner or demote owners
  if ((newRole === "owner" || targetMember.role === "owner") && membership.role !== "owner") {
    return { error: "Only owners can promote to owner or change owner roles" }
  }

  // If demoting an owner, ensure at least one owner remains
  if (targetMember.role === "owner" && newRole !== "owner") {
    const { count } = await adminClient
      .from("org_members")
      .select("*", { count: "exact", head: true })
      .eq("org_id", membership.org_id)
      .eq("role", "owner")

    if (count && count <= 1) {
      return { error: "Cannot demote the last owner. Promote another member first." }
    }
  }

  // Admin can't change other admins
  if (membership.role === "admin" && targetMember.role === "admin") {
    return { error: "Admins cannot change other admins' roles" }
  }

  const { error } = await adminClient.from("org_members").update({ role: newRole }).eq("id", memberId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  return { success: true }
}

export async function updateOrgSettings(
  orgId: string,
  settings: { name?: string; auto_join_domain?: boolean; domain?: string | null }
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Use admin client to bypass RLS
  const { createAdminClient } = await import("@/lib/db/server")
  const adminClient = createAdminClient()

  const { data: membership } = await adminClient
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .eq("org_id", orgId)
    .single()

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return { error: "Only owners and admins can update organization settings" }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (settings.name) updates.name = settings.name
  if (settings.auto_join_domain !== undefined) updates.auto_join_domain = settings.auto_join_domain
  if (settings.domain !== undefined) updates.domain = settings.domain

  const { error } = await adminClient.from("organizations").update(updates).eq("id", orgId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "layout")
  return { success: true }
}
