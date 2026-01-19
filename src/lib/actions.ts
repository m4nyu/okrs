"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import type { Objective, KeyResult } from "@/lib/types"

export async function createObjective(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  const title = formData.get("title") as string
  const description = formData.get("description") as string
  const endDate = formData.get("end_date") as string

  const { data, error } = await supabase
    .from("objectives")
    .insert({
      user_id: user.id,
      title,
      description,
      end_date: endDate,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "max")
  return { data }
}

export async function createObjectiveWithKeyResults(payload: unknown) {
  const { createObjectiveSchema } = await import("@/lib/types")
  
  // Validate with Zod
  const parsed = createObjectiveSchema.safeParse(payload)
  if (!parsed.success) {
    return { error: parsed.error.errors.map(e => e.message).join(", ") }
  }
  
  const { title, description, endDate, keyResults } = parsed.data
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  // Create objective
  const { data: objective, error: objError } = await supabase
    .from("objectives")
    .insert({
      user_id: user.id,
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
    const krsToInsert = keyResults.map(kr => ({
      objective_id: objective.id,
      title: kr.title,
      target_value: kr.targetValue,
      current_value: kr.startValue || 0,
      unit: kr.unit,
    }))

    const { error: krError } = await supabase
      .from("key_results")
      .insert(krsToInsert)

    if (krError) {
      return { error: krError.message }
    }
  }

  revalidatePath("/", "max")
  return { data: objective }
}

export async function updateObjectiveWithKeyResults(payload: {
  id: string;
  title: string;
  description: string;
  endDate: string;
  keyResults: { id: string; title: string; targetValue: number; unit: string; startValue: number }[];
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { id, title, description, endDate, keyResults } = payload

  // Update objective
  const { error: objError } = await supabase
    .from("objectives")
    .update({
      title,
      description: description || null,
      end_date: endDate,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)

  if (objError) {
    return { error: objError.message }
  }

  // Update key results - delete existing and insert new ones
  await supabase.from("key_results").delete().eq("objective_id", id)
  
  if (keyResults.length > 0) {
    const krsToInsert = keyResults.map(kr => ({
      objective_id: id,
      title: kr.title,
      target_value: kr.targetValue,
      current_value: kr.startValue || 0,
      unit: kr.unit,
    }))

    const { error: krError } = await supabase
      .from("key_results")
      .insert(krsToInsert)

    if (krError) {
      return { error: krError.message }
    }
  }

  revalidatePath("/", "max")
  return { success: true }
}

export async function createKeyResult(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  const objectiveId = formData.get("objective_id") as string
  const title = formData.get("title") as string
  const targetValue = parseFloat(formData.get("target_value") as string)
  const unit = formData.get("unit") as string || "%"

  const { data, error } = await supabase
    .from("key_results")
    .insert({
      objective_id: objectiveId,
      title,
      target_value: targetValue,
      unit,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "max")
  return { data }
}

export async function updateKeyResultProgress(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  const keyResultId = formData.get("key_result_id") as string
  const newValue = parseFloat(formData.get("new_value") as string)
  const note = formData.get("note") as string

  // Get current value first
  const { data: keyResult } = await supabase
    .from("key_results")
    .select("current_value")
    .eq("id", keyResultId)
    .single()

  if (!keyResult) {
    return { error: "Key result not found" }
  }

  // Create progress update
  await supabase.from("progress_updates").insert({
    key_result_id: keyResultId,
    previous_value: keyResult.current_value,
    new_value: newValue,
    note,
  })

  // Update current value
  const { error } = await supabase
    .from("key_results")
    .update({ current_value: newValue, updated_at: new Date().toISOString() })
    .eq("id", keyResultId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "max")
  return { success: true }
}

export async function toggleObjectivePublic(objectiveId: string, isPublic: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("objectives")
    .update({ is_public: isPublic })
    .eq("id", objectiveId)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "max")
  return { success: true }
}

export async function deleteObjective(objectiveId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("objectives")
    .delete()
    .eq("id", objectiveId)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "max")
  return { success: true }
}

export async function updateObjectiveStatus(objectiveId: string, status: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("objectives")
    .update({ status })
    .eq("id", objectiveId)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "max")
  return { success: true }
}

// Organization actions
export async function getUserOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(*)")
    .eq("user_id", user.id)
    .single()

  return membership
}

export async function createOrganization(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user?.email) {
    return { error: "Not authenticated" }
  }

  const domain = user.email.split("@")[1]
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")

  // Check if user already has an org
  const { data: existingMembership } = await supabase
    .from("org_members")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (existingMembership) {
    return { error: "You are already part of an organization" }
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      name,
      slug,
      domain,
      auto_join_domain: true,
      created_by: user.id,
    })
    .select()
    .single()

  if (orgError) {
    return { error: orgError.message }
  }

  // Add creator as owner
  const { error: memberError } = await supabase
    .from("org_members")
    .insert({
      org_id: org.id,
      user_id: user.id,
      role: "owner",
    })

  if (memberError) {
    return { error: memberError.message }
  }

  revalidatePath("/", "max")
  return { data: org }
}

export async function getOrgMembers(orgId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("org_members")
    .select("*")
    .eq("org_id", orgId)
    .order("joined_at", { ascending: true })

  if (error) return []
  
  // Get emails from auth.users via a function or separate query
  // For now, we'll return what we have
  return data
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

export async function inviteToOrg(email: string, role: "admin" | "member" = "member") {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get user's org and check if they're admin/owner
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single()

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return { error: "You don't have permission to invite members" }
  }

  // Check if email is already a member
  const { data: existingMember } = await supabase
    .from("org_members")
    .select("id")
    .eq("org_id", membership.org_id)

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

  revalidatePath("/", "max")
  return { data }
}

export async function acceptInvite(inviteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
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
  const { data: existingMembership } = await supabase
    .from("org_members")
    .select("id")
    .eq("user_id", user.id)
    .single()

  if (existingMembership) {
    return { error: "You are already part of an organization" }
  }

  // Add as member
  const { error: memberError } = await supabase
    .from("org_members")
    .insert({
      org_id: invite.org_id,
      user_id: user.id,
      role: invite.role,
    })

  if (memberError) {
    return { error: memberError.message }
  }

  // Delete invite
  await supabase.from("org_invites").delete().eq("id", inviteId)

  revalidatePath("/", "max")
  return { success: true }
}

export async function removeOrgMember(memberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get user's org and check if they're admin/owner
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single()

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

  const { error } = await supabase
    .from("org_members")
    .delete()
    .eq("id", memberId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "max")
  return { success: true }
}

export async function cancelInvite(inviteId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  // Get user's org
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single()

  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return { error: "You don't have permission to cancel invites" }
  }

  const { error } = await supabase
    .from("org_invites")
    .delete()
    .eq("id", inviteId)
    .eq("org_id", membership.org_id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "max")
  return { success: true }
}

export async function updateOrgSettings(settings: { name?: string; auto_join_domain?: boolean }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .single()

  if (!membership || membership.role !== "owner") {
    return { error: "Only owners can update organization settings" }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (settings.name) updates.name = settings.name
  if (settings.auto_join_domain !== undefined) updates.auto_join_domain = settings.auto_join_domain

  const { error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", membership.org_id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/", "max")
  return { success: true }
}
