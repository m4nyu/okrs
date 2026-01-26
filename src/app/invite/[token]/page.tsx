import Link from "next/link"
import { redirect } from "next/navigation"
import { acceptInvite } from "@/lib/actions"
import { AuthForm } from "@/lib/components/auth"
import { createClient } from "@/lib/db/server"

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  // Check if invite exists and is valid
  const { data: invite } = await supabase
    .from("org_invites")
    .select("*, organizations(name, slug)")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .single()

  if (!invite) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <h1 className="text-lg font-medium">Invalid or expired invite</h1>
          <p className="text-sm text-muted-foreground">This invite link is no longer valid.</p>
          <Link href="/" className="text-sm underline">
            Go to home
          </Link>
        </div>
      </div>
    )
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Not logged in - show auth form with context
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md p-8">
          <div className="mb-8 text-center">
            <h1 className="text-lg font-medium mb-2">Join {(invite.organizations as any)?.name}</h1>
            <p className="text-sm text-muted-foreground">Sign in to accept your invitation</p>
          </div>
          <AuthForm />
        </div>
      </div>
    )
  }

  // User is logged in - try to accept invite
  const result = await acceptInvite(token)

  if (result.error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <h1 className="text-lg font-medium">Could not accept invite</h1>
          <p className="text-sm text-muted-foreground">{result.error}</p>
          <Link href="/" className="text-sm underline">
            Go to home
          </Link>
        </div>
      </div>
    )
  }

  // Success - redirect to org
  redirect(`/org/${(invite.organizations as any)?.slug}`)
}
