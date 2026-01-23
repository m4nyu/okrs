"use client"

import type { User } from "@supabase/supabase-js"
import { ArrowRight, Check, Loader2, Mail, Plus, X } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
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
  const [checking, setChecking] = useState(false)
  const [nameStatus, setNameStatus] = useState<"idle" | "available" | "taken">("idle")

  // Debounced name availability check
  useEffect(() => {
    if (name.trim().length < 2) {
      setNameStatus("idle")
      return
    }

    setChecking(true)
    setNameStatus("idle")

    const timer = setTimeout(async () => {
      const supabase = createClient()
      const { data } = await supabase.from("organizations").select("id").ilike("name", name.trim()).maybeSingle()

      setNameStatus(data ? "taken" : "available")
      setChecking(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [name])

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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

      {/* Dialog */}
      <div className="relative w-full max-w-sm mx-4 bg-background border border-border rounded-lg shadow-lg p-6">
        {error && (
          <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded">{error}</div>
        )}

        {mode === "choose" && pendingInvites.length > 0 ? (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <h1 className="font-semibold text-lg">You have been invited</h1>
              <p className="text-sm text-muted-foreground mt-1">Join an organization to get started</p>
            </div>

            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <button
                  key={invite.id}
                  onClick={() => handleAcceptInvite(invite.id)}
                  disabled={loading}
                  className="w-full p-4 border border-border rounded-md text-left hover:border-foreground transition-colors disabled:opacity-50 group"
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
              className="w-full p-3 border border-dashed border-border rounded-md text-sm text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> Create new organization
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div className="space-y-4">
              <label className="text-sm font-medium block mb-3">Organization name</label>
              <div className="relative">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acme Inc"
                  required
                  autoFocus
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 pr-9 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
                {name.trim().length >= 2 && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {checking ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : nameStatus === "available" ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : nameStatus === "taken" ? (
                      <X className="h-4 w-4 text-red-500" />
                    ) : null}
                  </div>
                )}
              </div>
              {name.trim().length >= 2 && !checking && nameStatus !== "idle" && (
                <p className={`text-xs ${nameStatus === "available" ? "text-green-500" : "text-red-500"}`}>
                  {nameStatus === "available" ? "Name is available" : "Name is already taken"}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || nameStatus !== "available"}
              className="h-9 w-full rounded-md bg-primary text-primary-foreground text-sm font-medium shadow-xs hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Continue"}
            </button>

            {pendingInvites.length > 0 && (
              <button
                type="button"
                onClick={() => setMode("choose")}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Back to invites
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  )
}
