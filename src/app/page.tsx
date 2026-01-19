import { createClient } from "@/lib/supabase/server"
import { AuthForm } from "@/lib/components/auth-form"
import { Dashboard } from "@/lib/components/dashboard"
import { OrgSetup } from "@/lib/components/org-setup"

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true"

export default async function Home() {
  if (DEV_MODE) {
    return <Dashboard 
      user={{ id: "00000000-0000-0000-0000-000000000000", email: "dev@local" } as any} 
      org={{ id: "00000000-0000-0000-0000-000000000001", name: "Dev Org", slug: "dev", domain: "local", auto_join_domain: true, created_by: "00000000-0000-0000-0000-000000000000", created_at: "", updated_at: "" }}
      orgRole="owner"
      devMode
    />
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <AuthForm />
  }

  // Check for org membership
  const { data: membership } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(*)")
    .eq("user_id", user.id)
    .single()

  // Check for pending invites
  const { data: pendingInvites } = await supabase
    .from("org_invites")
    .select("*, organizations(*)")
    .eq("email", user.email?.toLowerCase())
    .gt("expires_at", new Date().toISOString())

  // If no org, show setup
  if (!membership) {
    return <OrgSetup user={user} pendingInvites={pendingInvites || []} />
  }

  const org = membership.organizations as any

  return <Dashboard user={user} org={org} orgRole={membership.role as "owner" | "admin" | "member"} />
}
