"use client"

import { useState } from "react"
import { ChevronDown, Plus } from "lucide-react"
import type { Organization } from "@/lib/types"

interface OrgWithRole extends Organization {
  role?: string
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

interface OrgSwitcherProps {
  currentOrg: Organization
  orgs: OrgWithRole[]
  onCreateOrg?: () => void
  onEditOrg?: (org: Organization) => void
  openUp?: boolean
}

export function OrgSwitcher({ currentOrg, orgs, onCreateOrg, onEditOrg, openUp }: OrgSwitcherProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative" data-org-switcher>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 hover:bg-muted/50 rounded-md px-2 py-1.5 -ml-2 transition-colors"
      >
        <div className={`w-3.5 h-3.5 flex items-center justify-center text-[8px] font-semibold text-white ${getOrgColor(currentOrg.name)}`}>
          {getOrgInitials(currentOrg.name)}
        </div>
        <span className="text-sm font-medium max-w-[120px] truncate">{currentOrg.name}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className={`absolute w-56 bg-background border border-border rounded-md shadow-lg z-50 py-1 ${openUp ? "bottom-full left-0 mb-1" : "top-full left-0 mt-1"}`}>
            <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
              Organizations
            </div>

            {orgs.map(o => (
              <div
                key={o.id}
                className={`flex items-center gap-2 px-2 py-2 hover:bg-muted/50 transition-colors ${o.id === currentOrg.id ? "bg-muted/30" : ""}`}
              >
                <a
                  href={`/org/${o.slug}`}
                  className="flex items-center gap-2 flex-1 min-w-0"
                  onClick={() => setOpen(false)}
                >
                  <div className={`w-5 h-5 flex items-center justify-center text-[10px] font-semibold text-white flex-shrink-0 ${getOrgColor(o.name)}`}>
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
