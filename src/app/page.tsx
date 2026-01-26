import { redirect } from "next/navigation"
import { generateOrg } from "@/lib/actions"
import { AuthForm } from "@/lib/components/auth"
import { createClient } from "@/lib/db/server"

export default async function Home({ searchParams }: { searchParams: Promise<{ new?: string }> }) {
  const { new: createNew } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <AuthForm />

  const { data: memberships } = await supabase
    .from("org_members")
    .select("org_id, role, organizations(*)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: true })

  const firstOrg = memberships?.find((m) => m.organizations)?.organizations as any

  if (firstOrg && createNew !== "1") {
    redirect(`/org/${firstOrg.slug}`)
  }

  const { data } = await generateOrg()
  redirect(`/org/${data?.slug}`)
}
