"use client"

import { Check, ChevronDown, Loader2, MoreVertical, Plus, X } from "lucide-react"
import { useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useRef, useState } from "react"
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/lib/components/ui/drawer"
import { ScrollArea } from "@/lib/components/ui/scroll-area"
import { TabsList, TabsTrigger } from "@/lib/components/ui/tabs"
import { useIsMobile } from "@/lib/hooks/use-mobile"
import type { Organization, OrgInvite, OrgMember } from "@/lib/types"

const ORG_COLORS = [
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

// Cache org colors to avoid recalculation
const colorCache = new Map<string, string>()

function getOrgColor(name: string): string {
  const cached = colorCache.get(name)
  if (cached) return cached

  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const color = ORG_COLORS[Math.abs(hash) % ORG_COLORS.length]
  colorCache.set(name, color)
  return color
}

function getOrgInitials(name: string): string {
  const words = name.trim().split(/\s+/)
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase()
  }
  return (words[0][0] + words[1][0]).toUpperCase()
}

function RoleDropdown({ value, onChange, options, openUp, borderless }: { value: string; onChange: (v: any) => void; options: string[]; openUp?: boolean; borderless?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={borderless ? "flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground" : "h-8 px-2 flex items-center gap-1 text-xs border border-border rounded-md bg-background hover:bg-muted/50"}
      >
        {value}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setOpen(false)} />
          <div className={`absolute ${openUp ? "bottom-full mb-1" : "top-full mt-1"} ${borderless ? "left-0" : "right-0"} z-50 bg-background border border-border rounded-md shadow-lg py-1 min-w-[80px]`}>
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

function InviteEditMenu({
  token,
  isOpen,
  onToggle,
  onClose,
  onCopy,
  onCancel,
}: {
  token: string
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
  onCopy: () => void
  onCancel: () => void
}) {
  return (
    <div className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        className="text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100"
      >
        edit
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-50" onClick={onClose} />
          <div className="absolute top-full right-0 mt-1 z-50 bg-background border border-border shadow-lg py-1 min-w-[100px]">
            <button
              type="button"
              onClick={async () => {
                onClose()
                const inviteUrl = `${window.location.origin}/invite/${token}`
                await navigator.clipboard.writeText(inviteUrl)
                onCopy()
              }}
              className="w-full px-3 py-1.5 text-xs text-left text-muted-foreground hover:text-foreground hover:bg-muted/50"
            >
              copy
            </button>
            <button
              type="button"
              onClick={async () => {
                onClose()
                await onCancel()
              }}
              className="w-full px-3 py-1.5 text-xs text-left text-muted-foreground hover:text-red-400 hover:bg-muted/50"
            >
              cancel
            </button>
          </div>
        </>
      )}
    </div>
  )
}

interface OrgWithRole extends Organization {
  role?: string
}

interface OrgSwitcherProps {
  currentOrg: Organization
  orgs: OrgWithRole[]
  onCreateOrg?: () => void
  onEditOrg?: (org: Organization) => void
  openUp?: boolean
}

export function OrgSwitcher({ currentOrg, orgs, onCreateOrg, onEditOrg, openUp }: OrgSwitcherProps) {
  const [open, setOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const router = useRouter()

  function handleOrgClick(o: OrgWithRole, e: React.MouseEvent) {
    e.preventDefault()
    if (o.id === currentOrg.id) {
      setOpen(false)
      return
    }
    setSwitching(true)
    setOpen(false)
    router.push(`/org/${o.slug}`)
  }

  if (switching) {
    return (
      <>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
        <div className="relative opacity-0" data-org-switcher>
          <button className="flex items-center gap-2 px-2 py-1.5 -ml-2">
            <div className="w-3.5 h-3.5" />
            <span className="text-sm font-medium">{currentOrg.name}</span>
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="relative" data-org-switcher>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 hover:bg-muted/50 rounded-md px-2 py-1.5 -ml-2 transition-colors"
      >
        <div
          className={`w-3.5 h-3.5 flex items-center justify-center text-[8px] font-semibold text-white ${getOrgColor(currentOrg.name)}`}
        >
          {getOrgInitials(currentOrg.name)}
        </div>
        <span className="text-sm font-medium max-w-[120px] truncate">{currentOrg.name}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute w-56 bg-background border border-border rounded-md shadow-lg z-50 py-1 ${openUp ? "bottom-full left-0 mb-1" : "top-full left-0 mt-1"}`}
          >
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">Organizations</div>

            {orgs.map((o) => (
              <div
                key={o.id}
                className={`flex items-center gap-2 px-2 py-2 transition-colors ${o.id === currentOrg.id ? "bg-muted/50" : "hover:bg-muted/50"}`}
              >
                <a
                  href={`/org/${o.slug}`}
                  className="flex items-center gap-2 flex-1 min-w-0"
                  onClick={(e) => handleOrgClick(o, e)}
                >
                  <div
                    className={`w-5 h-5 flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0 ${getOrgColor(o.name)}`}
                  >
                    {getOrgInitials(o.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{o.name}</p>
                    <p className="text-[9px] text-muted-foreground capitalize">{o.role}</p>
                  </div>
                </a>
                {(o.role === "owner" || o.role === "admin") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpen(false)
                      onEditOrg?.(o)
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                  >
                    edit
                  </button>
                )}
              </div>
            ))}

            <div className="border-t border-border mt-1 pt-1">
              <button
                onClick={() => {
                  setOpen(false)
                  onCreateOrg?.()
                }}
                className="flex items-center gap-2 px-2 py-2 w-full hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="text-sm">Create organization</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

interface OrgSettingsProps {
  org: Organization
  members: OrgMember[]
  invites: OrgInvite[]
  currentUserRole: "owner" | "admin" | "member"
  onClose: () => void
  onInvite: (email: string, role: "owner" | "admin" | "member") => Promise<{ error?: string }>
  onGenerateInviteLink: (role: "owner" | "admin" | "member") => Promise<{ error?: string; token?: string }>
  onRemoveMember: (memberId: string) => Promise<{ error?: string }>
  onUpdateMemberRole: (memberId: string, role: "owner" | "admin" | "member") => Promise<{ error?: string }>
  onUpdateMemberName: (memberId: string, name: string) => Promise<{ error?: string }>
  onTransferOwnership: (memberId: string) => Promise<{ error?: string }>
  onCancelInvite: (inviteId: string) => Promise<{ error?: string }>
  onResendInvite: (inviteId: string) => Promise<{ error?: string }>
  onUpdateInviteRole: (inviteId: string, role: "owner" | "admin" | "member") => Promise<{ error?: string }>
  onUpdateSettings: (settings: {
    name?: string
    auto_join_domain?: boolean
    domain?: string | null
  }) => Promise<{ error?: string }>
  onDeleteOrg: () => Promise<{ error?: string }>
  highlightOrgName?: boolean
}

export function OrgSettings({
  org,
  members,
  invites,
  currentUserRole,
  onClose,
  onInvite,
  onGenerateInviteLink,
  onRemoveMember,
  onUpdateMemberRole,
  onUpdateMemberName,
  onCancelInvite,
  onResendInvite,
  onUpdateInviteRole,
  onUpdateSettings,
  onDeleteOrg,
  highlightOrgName,
}: OrgSettingsProps) {
  const isMobile = useIsMobile()
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [tab, setTab] = useState("members")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"owner" | "admin" | "member">("member")
  const [linkRole, setLinkRole] = useState<"owner" | "admin" | "member">("member")
  const [inviteMenuOpen, setInviteMenuOpen] = useState<string | null>(null)
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null)
  const [cancelingInviteId, setCancelingInviteId] = useState<string | null>(null)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [emailValid, setEmailValid] = useState(false)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const [emailInvited, setEmailInvited] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current)
    }
  }, [])


  // Validate email with debounce
  useEffect(() => {
    if (!inviteEmail.trim()) {
      setEmailValid(false)
      setCheckingEmail(false)
      return
    }

    setCheckingEmail(true)
    const timer = setTimeout(() => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      setEmailValid(emailRegex.test(inviteEmail.trim()))
      setCheckingEmail(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [inviteEmail])
  const [orgName, setOrgName] = useState(org.name)
  const [savingName, setSavingName] = useState(false)
  const [checkingName, setCheckingName] = useState(false)
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null)
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [editingRole, setEditingRole] = useState<"owner" | "admin" | "member">("member")
  const [editingDomain, setEditingDomain] = useState(false)
  const [domainValue, setDomainValue] = useState(org.domain || "")
  const [domainError, setDomainError] = useState("")
  const [togglingAutoJoin, setTogglingAutoJoin] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const isAdmin = currentUserRole === "owner" || currentUserRole === "admin"
  const isOwner = currentUserRole === "owner"

  async function handleDeleteOrg() {
    setDeleting(true)
    const result = await onDeleteOrg()
    if (result.error) {
      setError(result.error)
      setDeleting(false)
      setConfirmDelete(false)
    } else {
      router.push("/")
    }
  }
  const nameChanged = orgName.trim() !== org.name && orgName.trim().length > 0

  useEffect(() => {
    if (!nameChanged) {
      setNameAvailable(null)
      setCheckingName(false)
      return
    }

    setCheckingName(true)
    setNameAvailable(null)

    const timer = setTimeout(() => {
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
      setEmailInvited(true)
      setTimeout(() => {
        setEmailInvited(false)
        setInviteEmail("")
      }, 2000)
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
    setCancelingInviteId(inviteId)
    setError("")
    const result = await onCancelInvite(inviteId)
    if (result.error) setError(result.error)
    setCancelingInviteId(null)
  }

  async function toggleDomainAccess() {
    setTogglingAutoJoin(true)
    setError("")
    const result = await onUpdateSettings({ auto_join_domain: !org.auto_join_domain })
    if (result.error) setError(result.error)
    setTogglingAutoJoin(false)
  }

  async function handleSaveMember(memberId: string, originalRole: "owner" | "admin" | "member") {
    setLoading(true)
    setError("")

    if (editingName.trim()) {
      const nameResult = await onUpdateMemberName(memberId, editingName.trim())
      if (nameResult.error) {
        setError(nameResult.error)
        setLoading(false)
        return
      }
    }

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

  function isValidDomain(domain: string): boolean {
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i
    return domainRegex.test(domain)
  }

  async function handleSaveDomain() {
    const trimmed = domainValue.trim().toLowerCase()

    if (!trimmed) {
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
                      borderless
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

  const invitesContent = (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Email</label>
          <form onSubmit={handleInvite} className="flex gap-2 items-center">
            <div className="flex-1 h-10 border border-border bg-background flex items-center px-3 gap-2 focus-within:border-foreground">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                required
                className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              />
              {checkingEmail && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground flex-shrink-0" />}
              {!checkingEmail && emailValid && (
                <button
                  type="submit"
                  disabled={loading}
                  className={`text-xs flex-shrink-0 bg-background px-1 ${emailInvited ? "text-green-500" : "text-muted-foreground hover:text-foreground"} disabled:opacity-50`}
                >
                  {loading ? "..." : emailInvited ? "invited" : "invite"}
                </button>
              )}
            </div>
            <RoleDropdown
              value={inviteRole}
              onChange={setInviteRole}
              options={currentUserRole === "owner" ? ["member", "admin", "owner"] : ["member", "admin"]}
            />
          </form>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Link</label>
          <div className="flex gap-2 items-center">
            <div className="group/link relative flex-1 h-10 border border-border bg-muted/30 flex items-center px-3 min-w-0">
              <input
                type="text"
                value={generatedLink || `${typeof window !== "undefined" ? window.location.origin : ""}/invite/...`}
                readOnly
                className="w-full bg-transparent text-sm text-muted-foreground focus:outline-none cursor-default"
              />
              <button
                type="button"
                onClick={async () => {
                  const result = await onGenerateInviteLink(linkRole)
                  if (result.token) {
                    const link = `${window.location.origin}/invite/${result.token}`
                    setGeneratedLink(link)
                    await navigator.clipboard.writeText(link)
                    setLinkCopied(true)
                    setTimeout(() => setLinkCopied(false), 2000)
                  }
                }}
                className={`absolute right-3 text-xs opacity-0 group-hover/link:opacity-100 transition-opacity bg-muted px-1 ${linkCopied ? "text-green-500 opacity-100" : "text-muted-foreground hover:text-foreground"}`}
              >
                {linkCopied ? "copied" : "copy"}
              </button>
            </div>
            <RoleDropdown
              value={linkRole}
              onChange={setLinkRole}
              options={currentUserRole === "owner" ? ["member", "admin", "owner"] : ["member", "admin"]}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Domain</label>
          <div className="flex items-center justify-between">
            <span className="text-sm">Auto-join</span>
            <button
              type="button"
              onClick={toggleDomainAccess}
              disabled={togglingAutoJoin || !org.domain}
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

        {invites.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Pending invites</label>
            <div className="space-y-1">
              {invites.map((invite) => (
                <div key={invite.id} className="group flex items-center justify-between py-2.5 px-3">
                  <div className="min-w-0 w-1/3">
                    <p className="text-[11px] truncate">{invite.email}</p>
                    <p className="text-[9px] text-muted-foreground">
                      expires {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  <RoleDropdown
                    value={invite.role}
                    onChange={async (newRole) => {
                      if (newRole !== invite.role) {
                        setLoading(true)
                        const result = await onUpdateInviteRole(invite.id, newRole)
                        if (result.error) setError(result.error)
                        setLoading(false)
                      }
                    }}
                    options={currentUserRole === "owner" ? ["owner", "admin", "member"] : ["admin", "member"]}
                    openUp
                    borderless
                  />
                  {cancelingInviteId === invite.id ? (
                    <span className="text-xs text-muted-foreground">canceling...</span>
                  ) : copiedInviteId === invite.id ? (
                    <span className="text-xs text-green-500">copied</span>
                  ) : (
                    <InviteEditMenu
                      token={invite.token}
                      isOpen={inviteMenuOpen === invite.id}
                      onToggle={() => setInviteMenuOpen(inviteMenuOpen === invite.id ? null : invite.id)}
                      onClose={() => setInviteMenuOpen(null)}
                      onCopy={() => {
                        setCopiedInviteId(invite.id)
                        setTimeout(() => setCopiedInviteId(null), 2000)
                      }}
                      onCancel={() => handleCancelInvite(invite.id)}
                    />
                  )}
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
      <div className="px-4 pt-4 pb-2">
        <TabsList className="w-full grid grid-cols-2 h-8">
          <TabsTrigger className="text-xs" data-state={tab === "members" ? "active" : "inactive"} onClick={() => setTab("members")}>
            Members
          </TabsTrigger>
          <TabsTrigger className="text-xs" data-state={tab === "invites" ? "active" : "inactive"} onClick={() => setTab("invites")}>
            Invites
          </TabsTrigger>
        </TabsList>
      </div>

      {error && <p className="px-4 py-2 text-xs text-red-400">{error}</p>}
      {success && <p className="px-4 py-2 text-xs text-green-400">{success}</p>}

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
                {isOwner && (
                  <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-500">
                    delete
                  </button>
                )}
              </div>
            </DrawerTitle>
          </DrawerHeader>
          {content}
          <Drawer open={confirmDelete} onOpenChange={setConfirmDelete}>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Delete organization</DrawerTitle>
                <DrawerDescription>Delete "{org.name}" and all its data?</DrawerDescription>
              </DrawerHeader>
              <div className="p-4 flex flex-col gap-2">
                <button
                  onClick={handleDeleteOrg}
                  disabled={deleting}
                  className="w-full py-2 text-sm bg-red-500 text-white disabled:opacity-50"
                >
                  {deleting ? "deleting..." : "delete"}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="w-full py-2 text-sm text-muted-foreground">
                  cancel
                </button>
              </div>
            </DrawerContent>
          </Drawer>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md h-[580px] max-h-[85vh] flex flex-col border border-border bg-background overflow-hidden"
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
          {isOwner && (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs text-red-500 hover:text-red-400 flex-shrink-0"
            >
              delete
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 flex-shrink-0"
          >
            close <kbd className="px-1 py-0.5 bg-muted font-mono text-[10px]">Esc</kbd>
          </button>
        </div>
        {content}
      </div>
      {confirmDelete && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConfirmDelete(false)}
        >
          <div className="w-full max-w-xs border border-border bg-background p-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm mb-4">Delete "{org.name}" and all its data?</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                cancel
              </button>
              <button
                onClick={handleDeleteOrg}
                disabled={deleting}
                className="px-3 py-1.5 text-xs bg-red-500 text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? "deleting..." : "delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface UserMenuProps {
  email: string
  onSignOut: () => void
  openUp?: boolean
}

export function UserMenu({ email, onSignOut, openUp }: UserMenuProps) {
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  async function handleDeleteAccount() {
    setDeleting(true)
    setDeleteError("")
    try {
      const res = await fetch("/api/auth/delete", { method: "DELETE" })
      const data = await res.json()
      if (data.error) {
        setDeleteError(data.error)
        setDeleting(false)
        return
      }
      window.location.href = "/login"
    } catch {
      setDeleteError("Failed to delete account")
      setDeleting(false)
    }
  }

  const deleteContent = (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Are you sure? This cannot be undone.</p>
      {deleteError && <p className="text-xs text-red-500">{deleteError}</p>}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setShowDeleteConfirm(false)}
          className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
        >
          cancel
        </button>
        <button
          onClick={handleDeleteAccount}
          disabled={deleting}
          className="px-4 py-2 bg-red-500 text-white text-sm disabled:opacity-50 hover:bg-red-600"
        >
          {deleting ? "deleting..." : "delete"}
        </button>
      </div>
    </div>
  )

  if (showDeleteConfirm) {
    if (isMobile) {
      return (
        <Drawer open onOpenChange={(open) => !open && setShowDeleteConfirm(false)}>
          <DrawerContent>
            <DrawerHeader className="select-none">
              <DrawerTitle className="text-red-500">Delete Account</DrawerTitle>
              <DrawerDescription className="sr-only">Confirm account deletion</DrawerDescription>
            </DrawerHeader>
            <div className="px-4 pb-6">{deleteContent}</div>
          </DrawerContent>
        </Drawer>
      )
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={() => setShowDeleteConfirm(false)}
      >
        <div className="w-full max-w-xs border border-border bg-background p-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex justify-between items-center mb-4 select-none">
            <span className="font-medium text-sm text-red-500">Delete Account</span>
            <button onClick={() => setShowDeleteConfirm(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          {deleteContent}
        </div>
      </div>
    )
  }

  return (
    <div className="relative" data-user-menu>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 hover:bg-muted/50 rounded-md px-2 py-1.5 -mr-2 transition-colors text-xs text-muted-foreground hover:text-foreground"
      >
        <span>{email}</span>
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute min-w-[120px] bg-background border border-border rounded-md shadow-lg z-50 py-1 flex ${openUp ? "bottom-full right-0 mb-1 flex-col-reverse" : "top-full right-0 mt-1 flex-col"}`}
          >
            <button
              onClick={() => {
                setOpen(false)
                onSignOut()
              }}
              className="px-3 py-2 w-full hover:bg-muted/50 transition-colors text-xs text-left text-muted-foreground hover:text-foreground"
            >
              sign out
            </button>
            <button
              onClick={() => {
                setOpen(false)
                setShowDeleteConfirm(true)
              }}
              className="px-3 py-2 w-full hover:bg-muted/50 transition-colors text-xs text-left text-red-400 hover:text-red-500"
            >
              delete account
            </button>
          </div>
        </>
      )}
    </div>
  )
}
