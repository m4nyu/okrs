"use client"

import { Check, ChevronDown, Loader2, X } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/lib/components/ui/drawer"
import { ScrollArea } from "@/lib/components/ui/scroll-area"
import { TabsList, TabsTrigger } from "@/lib/components/ui/tabs"
import { useIsMobile } from "@/lib/hooks/use-mobile"
import type { Organization, OrgInvite, OrgMember } from "@/lib/types"

// Custom dropdown component that stays within the dialog
function RoleDropdown({ value, onChange, options }: { value: string; onChange: (v: any) => void; options: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-8 px-2 flex items-center gap-1 text-xs border border-border rounded-md bg-background hover:bg-muted/50"
      >
        {value}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 z-50 bg-background border border-border rounded-md shadow-lg py-1 min-w-[80px]">
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt)
                  setOpen(false)
                }}
                className={`w-full px-3 py-1.5 text-xs text-left hover:bg-muted/50 ${value === opt ? "text-foreground" : "text-muted-foreground"}`}
              >
                {opt}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Generate a consistent color based on org name
function getOrgColor(name: string): string {
  const colors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-yellow-500",
    "bg-lime-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-teal-500",
    "bg-cyan-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-violet-500",
    "bg-purple-500",
    "bg-fuchsia-500",
    "bg-pink-500",
    "bg-rose-500",
  ]

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}

// Get initials from org name (max 2 characters)
function getOrgInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }
  return (words[0][0] + words[1][0]).toUpperCase()
}

interface OrgSettingsProps {
  org: Organization
  members: OrgMember[]
  invites: OrgInvite[]
  currentUserRole: "owner" | "admin" | "member"
  onClose: () => void
  onInvite: (email: string, role: "owner" | "admin" | "member") => Promise<{ error?: string }>
  onRemoveMember: (memberId: string) => Promise<{ error?: string }>
  onUpdateMemberRole: (memberId: string, role: "owner" | "admin" | "member") => Promise<{ error?: string }>
  onUpdateMemberName: (memberId: string, name: string) => Promise<{ error?: string }>
  onTransferOwnership: (memberId: string) => Promise<{ error?: string }>
  onCancelInvite: (inviteId: string) => Promise<{ error?: string }>
  onUpdateSettings: (settings: {
    name?: string
    auto_join_domain?: boolean
    domain?: string | null
  }) => Promise<{ error?: string }>
  highlightOrgName?: boolean
}

export function OrgSettings({
  org,
  members,
  invites,
  currentUserRole,
  onClose,
  onInvite,
  onRemoveMember,
  onUpdateMemberRole,
  onUpdateMemberName,
  onTransferOwnership,
  onCancelInvite,
  onUpdateSettings,
  highlightOrgName,
}: OrgSettingsProps) {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState("members")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"owner" | "admin" | "member">("member")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [linkCopied, setLinkCopied] = useState(false)
  const [orgName, setOrgName] = useState(org.name)
  const [savingName, setSavingName] = useState(false)
  const [checkingName, setCheckingName] = useState(false)
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)

  const isAdmin = currentUserRole === "owner" || currentUserRole === "admin"
  const nameChanged = orgName.trim() !== org.name && orgName.trim().length > 0

  // Debounced name availability check
  useEffect(() => {
    if (!nameChanged) {
      setNameAvailable(null)
      setCheckingName(false)
      return
    }

    setCheckingName(true)
    setNameAvailable(null)

    const timer = setTimeout(async () => {
      // For now, just simulate a check - names are always available unless empty
      // In a real app, you'd check against the database
      const slug = orgName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
      if (slug.length < 2) {
        setNameAvailable(false)
        setCheckingName(false)
        return
      }
      // Simulate API check
      setNameAvailable(true)
      setCheckingName(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [orgName, nameChanged])

  async function handleSaveOrgName() {
    if (!orgName.trim() || savingName) return
    if (orgName.trim() === org.name) return

    setSavingName(true)
    setError("")

    const result = await onUpdateSettings({ name: orgName.trim() })
    if (result.error) {
      setError(result.error)
      setSavingName(false)
      return
    }
    window.location.reload()
  }

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

  async function _handleUpdateMemberRole(memberId: string, newRole: "admin" | "member") {
    setLoading(true)
    setError("")
    const result = await onUpdateMemberRole(memberId, newRole)
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

  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingRole, setEditingRole] = useState<"owner" | "admin" | "member">("member")

  async function handleSaveMember(memberId: string, originalRole: "owner" | "admin" | "member") {
    setLoading(true)
    setError("")

    // Save name if changed
    if (editingName.trim()) {
      const nameResult = await onUpdateMemberName(memberId, editingName.trim())
      if (nameResult.error) {
        setError(nameResult.error)
        setLoading(false)
        return
      }
    }

    // Handle role change (multiple owners allowed)
    if (editingRole !== originalRole) {
      const roleResult = await onUpdateMemberRole(memberId, editingRole as "owner" | "admin" | "member")
      if (roleResult.error) {
        setError(roleResult.error)
        setLoading(false)
        return
      }
    }

    setEditingMemberId(null)
    setLoading(false)
  }

  const membersContent = (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-1">
        {members.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No members yet</p>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="group flex items-center justify-between h-[52px] px-2 rounded hover:bg-muted/30"
            >
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <div className="h-5 flex items-center">
                  {editingMemberId === member.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveMember(member.id, member.role)
                        if (e.key === "Escape") setEditingMemberId(null)
                      }}
                      autoFocus
                      className="w-full text-sm bg-transparent border-none outline-none p-0 m-0"
                      placeholder="Display name"
                    />
                  ) : (
                    <span className="text-sm truncate">
                      {member.user_name || member.user_email || member.user_id.slice(0, 8)}
                    </span>
                  )}
                </div>
                <div className="h-4 flex items-center">
                  {editingMemberId === member.id ? (
                    <RoleDropdown
                      value={editingRole}
                      onChange={setEditingRole}
                      options={currentUserRole === "owner" ? ["owner", "admin", "member"] : ["admin", "member"]}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground capitalize">{member.role}</span>
                  )}
                </div>
              </div>
              {isAdmin && (
                <div
                  className={`flex items-center gap-2 flex-shrink-0 justify-end ${editingMemberId === member.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                >
                  {editingMemberId === member.id ? (
                    <>
                      <button
                        onClick={() => handleSaveMember(member.id, member.role)}
                        disabled={loading}
                        className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                      >
                        save
                      </button>
                      <button
                        onClick={() => setEditingMemberId(null)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditingMemberId(member.id)
                          setEditingName(member.user_name || member.user_email || "")
                          setEditingRole(member.role)
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        edit
                      </button>
                      {member.role !== "owner" && (
                        <button
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={loading}
                          className="text-xs text-muted-foreground hover:text-red-400 disabled:opacity-50"
                        >
                          remove
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  )

  const [editingDomain, setEditingDomain] = useState(false)
  const [domainValue, setDomainValue] = useState(org.domain || "")
  const [domainError, setDomainError] = useState("")

  function isValidDomain(domain: string): boolean {
    // Basic domain validation: letters, numbers, hyphens, dots, at least one dot
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i
    return domainRegex.test(domain)
  }

  async function handleSaveDomain() {
    const trimmed = domainValue.trim().toLowerCase()

    if (!trimmed) {
      // Clear domain
      setLoading(true)
      setDomainError("")
      await onUpdateSettings({ domain: null, auto_join_domain: false })
      setLoading(false)
      setEditingDomain(false)
      return
    }

    if (!isValidDomain(trimmed)) {
      setDomainError("Invalid domain format")
      return
    }

    setLoading(true)
    setDomainError("")
    const result = await onUpdateSettings({ domain: trimmed })
    if (result.error) {
      setDomainError(result.error)
    } else {
      setEditingDomain(false)
    }
    setLoading(false)
  }

  const invitesContent = (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-8">
        {/* Email invite */}
        <div className="space-y-3">
          <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Email</label>
          <form onSubmit={handleInvite} className="flex flex-col gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className="w-full h-9 border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none rounded-md"
            />
            <div className="flex gap-2 items-center justify-end">
              <RoleDropdown
                value={inviteRole}
                onChange={setInviteRole}
                options={currentUserRole === "owner" ? ["member", "admin", "owner"] : ["member", "admin"]}
              />
              <button
                type="submit"
                disabled={loading || !inviteEmail.trim()}
                className="h-8 px-3 bg-foreground text-background text-xs font-medium disabled:opacity-50 rounded-md hover:opacity-90 transition-opacity"
              >
                {loading ? "..." : "invite"}
              </button>
            </div>
          </form>
        </div>

        {/* Invite link */}
        <div className="space-y-3">
          <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Link</label>
          <div
            onClick={copyInviteLink}
            className="flex items-center justify-between h-9 border border-border bg-muted/30 px-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <span className="text-sm text-muted-foreground truncate">
              {typeof window !== "undefined" ? window.location.origin : ""}?invite={org.id.slice(0, 8)}...
            </span>
            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">{linkCopied ? "copied!" : "copy"}</span>
          </div>
        </div>

        {/* Domain auto-join */}
        <div className="space-y-3">
          <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Domain</label>
          <div className="flex items-center justify-between">
            <span className="text-sm">Auto-join</span>
            <button
              type="button"
              onClick={toggleDomainAccess}
              disabled={loading || !org.domain}
              className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 disabled:opacity-50 ${org.auto_join_domain && org.domain ? "bg-foreground" : "bg-muted"}`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-background shadow-sm transition-all ${org.auto_join_domain && org.domain ? "left-5" : "left-0.5"}`}
              />
            </button>
          </div>
          {editingDomain ? (
            <div className="space-y-1">
              <div className="flex gap-2 items-center">
                <span className="text-xs text-muted-foreground">@</span>
                <input
                  type="text"
                  value={domainValue}
                  onChange={(e) => {
                    setDomainValue(e.target.value.replace(/^@/, ""))
                    setDomainError("")
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveDomain()
                    if (e.key === "Escape") {
                      setEditingDomain(false)
                      setDomainValue(org.domain || "")
                      setDomainError("")
                    }
                  }}
                  placeholder="company.com"
                  autoFocus
                  className={`flex-1 bg-transparent text-xs placeholder:text-muted-foreground focus:outline-none border-none ${domainError ? "text-red-500" : ""}`}
                />
                <button
                  onClick={handleSaveDomain}
                  disabled={loading}
                  className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  save
                </button>
                <button
                  onClick={() => {
                    setEditingDomain(false)
                    setDomainValue(org.domain || "")
                    setDomainError("")
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  cancel
                </button>
              </div>
              {domainError && <p className="text-xs text-red-500">{domainError}</p>}
            </div>
          ) : (
            <div
              onClick={() => setEditingDomain(true)}
              className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
            >
              {org.domain ? `@${org.domain} users can join` : "click to set domain"}
            </div>
          )}
        </div>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Pending invites</label>
            <div className="space-y-1 border border-border rounded-md divide-y divide-border">
              {invites.map((invite) => (
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
          <TabsTrigger data-state={tab === "members" ? "active" : "inactive"} onClick={() => setTab("members")}>
            Members
          </TabsTrigger>
          <TabsTrigger data-state={tab === "invites" ? "active" : "inactive"} onClick={() => setTab("invites")}>
            Invites
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Feedback */}
      {error && <p className="px-4 py-2 text-xs text-red-400">{error}</p>}
      {success && <p className="px-4 py-2 text-xs text-green-400">{success}</p>}

      {/* Content */}
      <div className="flex-1 overflow-hidden">{tab === "members" ? membersContent : invitesContent}</div>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="!mt-0 h-[80dvh] !max-h-[80dvh] flex flex-col">
          <DrawerHeader className="pb-0 select-none flex-shrink-0">
            <DrawerTitle asChild>
              <div className="flex items-center gap-2">
                <div
                  className={`w-5 h-5 flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0 ${getOrgColor(orgName || org.name)}`}
                >
                  {getOrgInitials(orgName || org.name)}
                </div>
                <input
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveOrgName()}
                  onBlur={handleSaveOrgName}
                  disabled={!isAdmin}
                  autoFocus={highlightOrgName}
                  className={`flex-1 min-w-0 h-8 bg-transparent text-sm font-medium border-none outline-none ${
                    !isAdmin ? "opacity-60" : ""
                  }`}
                />
                {nameChanged && checkingName && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                {nameChanged && !checkingName && nameAvailable === true && (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                )}
                {nameChanged && !checkingName && nameAvailable === false && <X className="h-3.5 w-3.5 text-red-500" />}
                {savingName && <span className="text-xs text-muted-foreground">saving...</span>}
              </div>
            </DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md h-[520px] max-h-[85vh] flex flex-col border border-border bg-background overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center gap-3 px-4 py-3 border-b border-border select-none flex-shrink-0">
          <div
            className={`w-5 h-5 flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0 ${getOrgColor(orgName || org.name)}`}
          >
            {getOrgInitials(orgName || org.name)}
          </div>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveOrgName()}
            onBlur={handleSaveOrgName}
            disabled={!isAdmin}
            autoFocus={highlightOrgName}
            className={`flex-1 min-w-0 h-8 bg-transparent text-sm font-medium border-none outline-none ${!isAdmin ? "opacity-60" : ""}`}
          />
          {nameChanged && checkingName && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground flex-shrink-0" />
          )}
          {nameChanged && !checkingName && nameAvailable === true && (
            <Check className="h-3.5 w-3.5 text-green-500 flex-shrink-0" />
          )}
          {nameChanged && !checkingName && nameAvailable === false && (
            <X className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
          )}
          {savingName && <span className="text-xs text-muted-foreground flex-shrink-0">saving...</span>}
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 flex-shrink-0"
          >
            close <kbd className="px-1 py-0.5 bg-muted font-mono text-[10px]">Esc</kbd>
          </button>
        </div>
        {content}
      </div>
    </div>
  )
}
