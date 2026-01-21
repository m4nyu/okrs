import { createClient } from "@/lib/supabase/server"
import { AuthForm } from "@/lib/components/auth-form"
import { Dashboard } from "@/lib/components/dashboard"
import { redirect } from "next/navigation"

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true"

export default async function OrgPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ setup?: string }>
}) {
  const { slug } = await params
  const { setup } = await searchParams
  const needsOrgName = setup === "1"

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

  // Get the org by slug
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .single()

  if (!org) {
    redirect("/")
  }

  // Check if user is a member of this org
  const { data: membership } = await supabase
    .from("org_members")
    .select("role")
    .eq("org_id", org.id)
    .eq("user_id", user.id)
    .single()

  if (!membership) {
    redirect("/")
  }

  // Fetch all user's orgs for the org switcher
  const { data: allMemberships } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })

  const userOrgs = allMemberships
    ?.filter(m => m.organizations)
    .map(m => ({
      ...(m.organizations as any),
      role: m.role
    })) || []

  return <Dashboard user={user} org={org} orgRole={membership.role as "owner" | "admin" | "member"} needsOrgName={needsOrgName} userOrgs={userOrgs} />
}
