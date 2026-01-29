import { NextResponse } from "next/server"
import { createAdminClient, createClient } from "@/lib/db/server"

export async function DELETE() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const admin = createAdminClient()

  try {
    // Find organizations where user is the ONLY member and they created it
    // These should be deleted entirely (not left as empty orgs)
    const { data: userOrgs } = await admin
      .from("organizations")
      .select("id, org_members(id)")
      .eq("created_by", user.id)

    if (userOrgs) {
      for (const org of userOrgs) {
        const memberCount = (org as any).org_members?.length || 0
        if (memberCount <= 1) {
          // User is the only member - delete the org
          // CASCADE will handle: org_members, org_invites, objectives, key_results, progress_updates
          await admin.from("organizations").delete().eq("id", org.id)
        }
      }
    }

    // Sign out the user first
    await supabase.auth.signOut()

    // Delete the user from Supabase Auth
    // CASCADE will handle: objectives (user_id), org_members (user_id), org_invites (invited_by)
    // And further cascades: key_results (objective_id), progress_updates (key_result_id)
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
