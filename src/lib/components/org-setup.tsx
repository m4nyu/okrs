"use client"

import React from "react"

import { useState } from "react"
import { Building2, Mail, Plus, ArrowRight } from "lucide-react"
import type { User } from "@supabase/supabase-js"
import type { Organization } from "@/lib/types"

interface OrgSetupProps {
  user: User
  pendingInvites: Array<{
    id: string
    email: string
    role: string
    organizations: Organization
  }>
}

export function OrgSetup({ user, pendingInvites }: OrgSetupProps) {
  const [mode, setMode] = useState<"choose" | "create">(pendingInvites.length > 0 ? "choose" : "create")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const domain = user.email?.split("@")[1] || ""

  async function handleCreateOrg(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError("")
    
    const { createOrganization } = await import("@/lib/actions")
    const result = await createOrganization(name.trim())
    
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      window.location.reload()
    }
  }

  async function handleAcceptInvite(inviteId: string) {
    setLoading(true)
    setError("")
    
    const { acceptInvite } = await import("@/lib/actions")
    const result = await acceptInvite(inviteId)
    
    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {error && (
          <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {error}
          </div>
        )}

        {mode === "choose" && pendingInvites.length > 0 ? (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <h1 className="font-medium">You have been invited</h1>
              <p className="text-sm text-muted-foreground mt-1">Join an organization to get started</p>
            </div>

            <div className="space-y-2">
              {pendingInvites.map(invite => (
                <button
                  key={invite.id}
                  onClick={() => handleAcceptInvite(invite.id)}
                  disabled={loading}
                  className="w-full p-4 border border-border text-left hover:border-foreground transition-colors disabled:opacity-50 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{invite.organizations.name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">Join as {invite.role}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </button>
              ))}
            </div>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <button
              onClick={() => setMode("create")}
              className="w-full p-3 border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> Create new organization
            </button>
          </div>
        ) : (
          <div className="border border-border p-6">
            <div className="flex items-center gap-2 mb-6">
              <Building2 className="h-5 w-5" />
              <h1 className="font-medium">Create organization</h1>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              Create an organization for your team. Everyone with an @{domain} email can join automatically.
            </p>

            <form onSubmit={handleCreateOrg} className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Organization name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Acme Inc"
                  required
                  autoFocus
                  className="w-full h-10 border border-border bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                />
              </div>

              <div className="text-[10px] text-muted-foreground p-2 bg-muted/50 border border-border">
                <p className="font-medium text-foreground mb-1">Auto-join enabled</p>
                <p>Anyone with @{domain} email will automatically join your organization when they sign up.</p>
              </div>

              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full h-10 bg-foreground text-background text-sm disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create organization"}
              </button>

              {pendingInvites.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMode("choose")}
                  className="w-full text-xs text-muted-foreground hover:text-foreground"
                >
                  Back to invites
                </button>
              )}
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
