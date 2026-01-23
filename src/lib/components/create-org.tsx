"use client"

import { Building2 } from "lucide-react"
import type React from "react"
import { useState } from "react"

interface CreateOrgProps {
  userEmail: string
  onCreateOrg: (name: string) => Promise<{ error?: string }>
  onSkip?: () => void
}

export function CreateOrg({ userEmail, onCreateOrg, onSkip }: CreateOrgProps) {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const domain = userEmail.split("@")[1]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError("")
    const result = await onCreateOrg(name.trim())
    if (result.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm border border-border p-6">
        <div className="flex items-center gap-2 mb-6">
          <Building2 className="h-5 w-5" />
          <h1 className="font-medium">Create organization</h1>
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Create an organization for your team. Everyone with an @{domain} email can join automatically.
        </p>

        {error && <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Organization name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
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
        </form>
      </div>
    </div>
  )
}
