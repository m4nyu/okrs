import { redirect } from "next/navigation"
import { generateAndCreateOrg } from "@/lib/actions"
import { AuthForm } from "@/lib/components/auth"
import { Dashboard } from "@/lib/components/dashboard"
import { createClient } from "@/lib/supabase/server"

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true"

export default async function Home({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: createNew } = await searchParams

  if (DEV_MODE) {
    return (
      <Dashboard
        user={{ id: "00000000-0000-0000-0000-000000000000", email: "dev@local" } as any}
        org={{
          id: "00000000-0000-0000-0000-000000000001",
          name: "Dev Org",
          slug: "dev",
          domain: "local",
          auto_join_domain: true,
          created_by: "00000000-0000-0000-0000-000000000000",
          created_at: "",
          updated_at: "",
        }}
        orgRole="owner"
        devMode
      />
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <AuthForm />
  }

  // Check for all org memberships (multi-org support)
  const { data: memberships } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })

  const userOrgs =
    memberships
      ?.filter((m) => m.organizations)
      .map((m) => ({
        ...(m.organizations as any),
        role: m.role,
      })) || []

  // If has orgs and not creating new, redirect to first org URL
  if (userOrgs.length > 0 && createNew !== "1") {
    redirect(`/org/${userOrgs[0].slug}`)
  }

  // No org - create one and redirect
  const result = await generateAndCreateOrg()

  if (result.data?.slug) {
    redirect(`/org/${result.data.slug}`)
  }

  // Show error if creation failed
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        <p className="text-sm text-muted-foreground">{result.error || "Failed to create organization"}</p>
        <a href="/" className="text-sm underline">
          Try again
        </a>
      </div>
    </div>
  )
}
