"use client"

import React, { useState } from "react"
import type { Organization, OrgMember, OrgInvite } from "@/lib/types"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/lib/components/ui/drawer"
import { useIsMobile } from "@/lib/hooks/use-mobile"
import { ScrollArea } from "@/lib/components/ui/scroll-area"
import { TabsList, TabsTrigger } from "@/lib/components/ui/tabs"

interface OrgSettingsProps {
  org: Organization
  members: OrgMember[]
  invites: OrgInvite[]
  currentUserRole: "owner" | "admin" | "member"
  onClose: () => void
  onInvite: (email: string, role: "admin" | "member") => Promise<{ error?: string }>
  onRemoveMember: (memberId: string) => Promise<{ error?: string }>
  onCancelInvite: (inviteId: string) => Promise<{ error?: string }>
  onUpdateSettings: (settings: { name?: string; auto_join_domain?: boolean }) => Promise<{ error?: string }>
}

export function OrgSettings({ 
  org, 
  members, 
  invites, 
  currentUserRole, 
  onClose, 
  onInvite, 
  onRemoveMember, 
  onCancelInvite,
  onUpdateSettings 
}: OrgSettingsProps) {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState("members")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [linkCopied, setLinkCopied] = useState(false)

  const isAdmin = currentUserRole === "owner" || currentUserRole === "admin"

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setLoading(true)
    setError("")
    setSuccess("")
    const result = await onInvite(inviteEmail.trim(), inviteRole)
    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(`Invited ${inviteEmail}`)
      setInviteEmail("")
      setTimeout(() => setSuccess(""), 3000)
    }
    setLoading(false)
  }

  async function handleRemoveMember(memberId: string) {
    setLoading(true)
    setError("")
    const result = await onRemoveMember(memberId)
    if (result.error) setError(result.error)
    setLoading(false)
  }

  async function handleCancelInvite(inviteId: string) {
    setLoading(true)
    setError("")
    const result = await onCancelInvite(inviteId)
    if (result.error) setError(result.error)
    setLoading(false)
  }

  async function toggleDomainAccess() {
    setLoading(true)
    setError("")
    const result = await onUpdateSettings({ auto_join_domain: !org.auto_join_domain })
    if (result.error) setError(result.error)
    setLoading(false)
  }

  function copyInviteLink() {
    const link = `${window.location.origin}?invite=${org.id}`
    navigator.clipboard.writeText(link)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  const membersContent = (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-1">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No members yet</p>
        ) : members.map(member => (
          <div key={member.id} className="group flex items-center justify-between py-2.5 px-2 rounded hover:bg-muted/30">
            <div className="min-w-0">
              <p className="text-sm truncate">{member.user_email || member.user_id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground capitalize">{member.role}</p>
            </div>
            {isAdmin && member.role !== "owner" && (
              <button 
                onClick={() => handleRemoveMember(member.id)}
                disabled={loading}
                className="text-xs text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 disabled:opacity-50 px-2"
              >
                remove
              </button>
            )}
          </div>
        ))}
      </div>
    </ScrollArea>
  )

  const invitesContent = (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-5">
        {/* Email invite */}
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Invite by email</label>
          <form onSubmit={handleInvite} className="space-y-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className="w-full h-9 border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none rounded-md"
            />
            <div className="flex gap-2">
              <select 
                value={inviteRole} 
                onChange={e => setInviteRole(e.target.value as "admin" | "member")}
                className="flex-1 h-9 border border-border bg-background px-2 text-sm focus:border-foreground focus:outline-none cursor-pointer rounded-md"
              >
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
              <button 
                type="submit" 
                disabled={loading || !inviteEmail.trim()}
                className="flex-1 h-9 bg-foreground text-background text-sm font-medium disabled:opacity-50 rounded-md hover:opacity-90 transition-opacity"
              >
                {loading ? "..." : "send"}
              </button>
            </div>
          </form>
        </div>

        {/* Invite link */}
        <div>
          <label className="text-xs text-muted-foreground mb-2 block">Share invite link</label>
          <div className="space-y-2">
            <input
              type="text"
              readOnly
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}?invite=${org.id}`}
              className="w-full h-9 border border-border bg-muted/30 px-3 text-sm text-muted-foreground rounded-md"
            />
            <button 
              type="button"
              onClick={copyInviteLink}
              className="w-full h-9 border border-border text-sm hover:bg-muted/50 rounded-md transition-colors"
            >
              {linkCopied ? "copied!" : "copy"}
            </button>
          </div>
        </div>

        {/* Domain access */}
        {org.domain && (
          <div className="flex items-center justify-between gap-3 py-3 px-3 border border-border rounded-md">
            <div className="min-w-0">
              <p className="text-sm">Domain auto-join</p>
              <p className="text-xs text-muted-foreground">@{org.domain} users can join automatically</p>
            </div>
            <button
              type="button"
              onClick={toggleDomainAccess}
              disabled={loading}
              className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${org.auto_join_domain ? "bg-foreground" : "bg-muted"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-background shadow-sm transition-all ${org.auto_join_domain ? "left-5" : "left-0.5"}`} />
            </button>
          </div>
        )}

        {/* Pending invites */}
        {invites.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Pending invites</label>
            <div className="space-y-1 border border-border rounded-md divide-y divide-border">
              {invites.map(invite => (
                <div key={invite.id} className="group flex items-center justify-between py-2.5 px-3">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {invite.role} · expires {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleCancelInvite(invite.id)}
                    disabled={loading}
                    className="text-xs text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 disabled:opacity-50 px-2"
                  >
                    cancel
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )

  const content = (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="px-4 pt-4 pb-2">
        <TabsList className="w-full grid grid-cols-2 h-10">
          <TabsTrigger 
            data-state={tab === "members" ? "active" : "inactive"}
            onClick={() => setTab("members")}
          >
            Members
          </TabsTrigger>
          <TabsTrigger 
            data-state={tab === "invites" ? "active" : "inactive"}
            onClick={() => setTab("invites")}
          >
            Invites
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Feedback */}
      {error && <p className="px-4 py-2 text-xs text-red-400">{error}</p>}
      {success && <p className="px-4 py-2 text-xs text-green-400">{success}</p>}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === "members" ? membersContent : invitesContent}
      </div>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open onOpenChange={open => !open && onClose()}>
        <DrawerContent className="!mt-0 h-[80dvh] !max-h-[80dvh] flex flex-col">
          <DrawerHeader className="pb-0 select-none flex-shrink-0">
            <DrawerTitle className="text-sm font-medium">{org.name}</DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md h-[480px] flex flex-col border border-border bg-background overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center px-4 py-3 border-b border-border select-none flex-shrink-0">
          <span className="text-sm font-medium">{org.name}</span>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5">
            close <kbd className="px-1 py-0.5 bg-muted font-mono text-[10px]">Esc</kbd>
          </button>
        </div>
        {content}
      </div>
    </div>
  )
}
