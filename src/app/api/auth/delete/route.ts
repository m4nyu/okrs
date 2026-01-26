import { NextResponse } from "next/server"
import { createClient, createAdminClient } from "@/lib/db/server"

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const admin = createAdminClient()

  try {
    // Delete all user's progress updates (via key_results -> objectives)
    const { data: objectives } = await admin
      .from("objectives")
      .select("id")
      .eq("user_id", user.id)

    if (objectives && objectives.length > 0) {
      const objectiveIds = objectives.map(o => o.id)

      // Get all key results for user's objectives
      const { data: keyResults } = await admin
        .from("key_results")
        .select("id")
        .in("objective_id", objectiveIds)

      if (keyResults && keyResults.length > 0) {
        const krIds = keyResults.map(kr => kr.id)

        // Delete progress updates
        await admin
          .from("progress_updates")
          .delete()
          .in("key_result_id", krIds)
      }

      // Delete key results
      await admin
        .from("key_results")
        .delete()
        .in("objective_id", objectiveIds)

      // Delete objectives
      await admin
        .from("objectives")
        .delete()
        .eq("user_id", user.id)
    }

    // Delete user's org invites they sent
    await admin
      .from("org_invites")
      .delete()
      .eq("invited_by", user.id)

    // Delete user's org memberships
    await admin
      .from("org_members")
      .delete()
      .eq("user_id", user.id)

    // Delete organizations where user is the only member (cleanup)
    const { data: emptyOrgs } = await admin
      .from("organizations")
      .select("id, org_members(id)")
      .eq("created_by", user.id)

    if (emptyOrgs) {
      for (const org of emptyOrgs) {
        const memberCount = (org as any).org_members?.length || 0
        if (memberCount === 0) {
          // Delete org invites
          await admin.from("org_invites").delete().eq("org_id", org.id)
          // Delete organization
          await admin.from("organizations").delete().eq("id", org.id)
        }
      }
    }

    // Sign out the user first
    await supabase.auth.signOut()

    // Delete the user from Supabase Auth
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error("Failed to delete user:", deleteError)
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Delete account error:", e)
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 })
  }
}
