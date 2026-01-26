"use client"

import type { User } from "@supabase/supabase-js"
import {
  ChevronRight,
  Loader2,
  Monitor,
  Moon,
  MoreVertical,
  Plus,
  Sparkles,
  Sun,
  Target,
  Trash2,
  X,
} from "lucide-react"
import dynamic from "next/dynamic"
import type React from "react"
import { useCallback, useEffect, useState } from "react"

// Lazy load chart to defer ~250KB recharts bundle
const ProgressChart = dynamic(() => import("@/lib/components/progress-chart"), {
  ssr: false,
  loading: () => <div className="h-64 mb-8 animate-pulse bg-muted/30 rounded" />,
})

import useSWR from "swr"
import { OrgSettings, OrgSwitcher, UserMenu } from "@/lib/components/org"
import { CHART_FILL_CLASSES, OKR_ICONS } from "@/lib/components/progress-chart"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/lib/components/ui/drawer"
import { ScrollArea } from "@/lib/components/ui/scroll-area"
import { createClient } from "@/lib/db/client"
import { useIsMobile } from "@/lib/hooks/use-mobile"
import { $, useStore } from "@/lib/store"
import type { KeyResult, Objective, ObjectiveWithProgress, Organization } from "@/lib/types"

const MAX_OBJECTIVES = 5

interface OrgWithRole extends Organization {
  role?: string
}

interface Props {
  user: User
  org: Organization
  orgRole: "owner" | "admin" | "member"
  devMode?: boolean
  needsOrgName?: boolean
  userOrgs?: OrgWithRole[]
}

async function fetchObjectives(orgId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from("objectives")
    .select(`*, key_results (*, progress_updates (*))`)
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
  if (!data) return []
  return data.map((obj) => {
    const krs = (obj as Objective & { key_results: (KeyResult & { progress_updates: any[] })[] }).key_results || []
    const krsWithSortedUpdates = krs.map((kr) => ({
      ...kr,
      progress_updates: (kr.progress_updates || []).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    }))
    const percentages = krs.map((k) => {
      if (k.target_value === 0) return 0
      return k.current_value <= k.target_value
        ? Math.min((k.current_value / k.target_value) * 100, 100)
        : Math.min((k.target_value / k.current_value) * 100, 100)
    })
    percentages.sort((a, b) => a - b)
    const mid = Math.floor(percentages.length / 2)
    const p =
      percentages.length === 0
        ? 0
        : percentages.length % 2 !== 0
          ? percentages[mid]
          : (percentages[mid - 1] + percentages[mid]) / 2
    return { ...obj, key_results: krsWithSortedUpdates, overall_progress: Math.min(p, 100) } as ObjectiveWithProgress
  })
}

function ThemeButton({
  mobileOrg,
  mobileUserOrgs,
  mobileOpenOrgSettings,
  mobileSignOut,
  mobileUserEmail,
}: {
  mobileOrg?: Organization
  mobileUserOrgs?: (Organization & { role?: string })[]
  mobileOpenOrgSettings?: () => void
  mobileSignOut?: () => void
  mobileUserEmail?: string
}) {
  const theme = useStore((s) => s.theme)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (theme === "system") {
      document.documentElement.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches)
    } else {
      document.documentElement.classList.toggle("dark", theme === "dark")
    }
  }, [theme])

  const select = (v: "light" | "dark" | "system") => {
    $.set("theme", v)
    setOpen(false)
  }

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor

  return (
    <>
      <div className="md:hidden fixed top-3 left-3 z-40 select-none flex items-center gap-2">
        <Target className="h-4 w-4" />
        <span className="text-sm font-medium">OKR</span>
      </div>
      <div className="md:hidden fixed top-3 right-3 z-40 select-none">
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="w-7 h-7 flex items-center justify-center border border-border bg-background text-muted-foreground hover:text-foreground"
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
          {open && (
            <div className="absolute top-full right-0 mt-1 border border-border bg-background p-1 flex flex-col min-w-[100px]">
              {(["light", "dark", "system"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => select(v)}
                  className={`px-3 py-1.5 text-xs text-left hover:bg-muted ${theme === v ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background z-40 flex items-center justify-between px-4 h-12 select-none">
        {mobileOrg && mobileUserOrgs && (
          <OrgSwitcher
            currentOrg={mobileOrg}
            orgs={mobileUserOrgs}
            onCreateOrg={() => {
              window.location.href = "/?new=1"
            }}
            onEditOrg={() => {
              mobileOpenOrgSettings?.()
            }}
            openUp
          />
        )}
        {mobileUserEmail && mobileSignOut && <UserMenu email={mobileUserEmail} onSignOut={mobileSignOut} openUp />}
      </nav>
      <div className="hidden md:flex fixed bottom-4 right-4 z-40 select-none gap-1">
        <button
          onClick={() => $.show("help")}
          className="w-7 h-7 flex items-center justify-center border border-border bg-background text-muted-foreground hover:text-foreground text-[10px] font-mono"
        >
          ?
        </button>
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="w-7 h-7 flex items-center justify-center border border-border bg-background text-muted-foreground hover:text-foreground"
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
          {open && (
            <div className="absolute bottom-full right-0 mb-2 border border-border bg-background p-1 flex flex-col min-w-[100px]">
              {(["light", "dark", "system"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => select(v)}
                  className={`px-3 py-1.5 text-xs text-left hover:bg-muted ${theme === v ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function ObjectiveModal({
  onClose,
  onDone,
  devMode,
  onDevCreate,
  editingObjective,
  onDevUpdate,
  orgId,
}: {
  onClose: () => void
  onDone: () => void
  devMode?: boolean
  onDevCreate?: (obj: ObjectiveWithProgress) => void
  editingObjective?: ObjectiveWithProgress | null
  onDevUpdate?: (obj: ObjectiveWithProgress) => void
  orgId: string
}) {
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [title, setTitle] = useState(editingObjective?.title || "")
  const [description, setDescription] = useState(editingObjective?.description || "")
  const [keyResults, setKeyResults] = useState<
    { id: string; title: string; targetValue: number; unit: string; startValue: number }[]
  >(
    editingObjective?.key_results.map((kr) => ({
      id: kr.id,
      title: kr.title,
      targetValue: kr.target_value,
      unit: kr.unit,
      startValue: kr.current_value,
    })) || []
  )
  const [validationHints, setValidationHints] = useState<
    { field: "title" | "description"; issue: string; hint: string }[]
  >([])
  const date = new Date()
  date.setMonth(date.getMonth() + 3)
  const [endDate, setEndDate] = useState(editingObjective?.end_date || date.toISOString().split("T")[0])
  const isEditing = !!editingObjective

  function addKr() {
    setKeyResults([...keyResults, { id: crypto.randomUUID(), title: "", targetValue: 100, unit: "%", startValue: 0 }])
  }

  function updateKr(id: string, field: string, value: string | number) {
    setKeyResults(keyResults.map((kr) => (kr.id === id ? { ...kr, [field]: value } : kr)))
  }

  function removeKr(id: string) {
    setKeyResults(keyResults.filter((kr) => kr.id !== id))
  }

  async function generateWithAI() {
    if (!title.trim()) return
    setGenerating(true)
    setValidationHints([])
    try {
      const validateRes = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validateObjective", data: { title, description } }),
      })
      const validateData = await validateRes.json()
      if (validateData.error) {
        setGenerating(false)
        return
      }
      if (!validateData.isValid && validateData.issues?.length > 0) {
        setValidationHints(validateData.issues)
        setGenerating(false)
        return
      }
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generateKeyResults", data: { title, description } }),
      })
      const data = await res.json()
      if (data.error) return
      const generated = data.keyResults || []
      if (generated.length === 0) return
      setKeyResults(
        generated.map((kr: { title: string; targetValue: number; unit: string; startValue: number }) => ({
          id: crypto.randomUUID(),
          title: kr.title,
          targetValue: kr.targetValue,
          unit: kr.unit,
          startValue: kr.startValue,
        }))
      )
      setValidationHints([])
    } catch {
    } finally {
      setGenerating(false)
    }
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    setLoading(true)
    if (devMode) {
      if (isEditing && editingObjective && onDevUpdate) {
        onDevUpdate({
          ...editingObjective,
          title,
          description,
          end_date: endDate,
          updated_at: new Date().toISOString(),
          key_results: keyResults
            .filter((kr) => kr.title.trim())
            .map((kr) => ({
              id: kr.id,
              objective_id: editingObjective.id,
              title: kr.title,
              target_value: kr.targetValue,
              current_value: kr.startValue,
              unit: kr.unit,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })),
        })
        onDone()
        return
      } else if (onDevCreate) {
        onDevCreate({
          id: crypto.randomUUID(),
          user_id: "dev",
          org_id: null,
          title,
          description,
          status: "active",
          end_date: endDate,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          key_results: keyResults
            .filter((kr) => kr.title.trim())
            .map((kr) => ({
              id: crypto.randomUUID(),
              objective_id: "",
              title: kr.title,
              target_value: kr.targetValue,
              current_value: kr.startValue,
              unit: kr.unit,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })),
          overall_progress: 0,
        })
        onDone()
        return
      }
    }
    if (isEditing && editingObjective) {
      const { updateObjective } = await import("@/lib/actions")
      await updateObjective(
        {
          id: editingObjective.id,
          title,
          description,
          endDate,
          keyResults: keyResults
            .filter((kr) => kr.title.trim())
            .map((kr) => ({
              id: kr.id,
              title: kr.title,
              targetValue: kr.targetValue,
              unit: kr.unit,
              startValue: kr.startValue,
            })),
        },
        orgId
      )
    } else {
      const { createObjective } = await import("@/lib/actions")
      await createObjective(
        {
          title,
          description,
          endDate,
          keyResults: keyResults
            .filter((kr) => kr.title.trim())
            .map((kr) => ({
              title: kr.title,
              targetValue: kr.targetValue,
              unit: kr.unit,
              startValue: kr.startValue,
            })),
        },
        orgId
      )
    }
    onDone()
  }

  const formFields = (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">What do you want to achieve?</label>
        <input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            setValidationHints((prev) => prev.filter((h) => h.field !== "title"))
          }}
          placeholder="e.g. Increase revenue by 50%"
          required
          autoFocus
          className={`w-full h-10 border bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:outline-none ${validationHints.some((h) => h.field === "title") ? "border-amber-500 focus:border-amber-500" : "border-border focus:border-foreground"}`}
        />
        {validationHints
          .filter((h) => h.field === "title")
          .map((hint, i) => (
            <p key={i} className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
              {hint.hint}
            </p>
          ))}
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">Why is this important?</label>
        <textarea
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            setValidationHints((prev) => prev.filter((h) => h.field !== "description"))
          }}
          placeholder="Provide context: why this matters, what success looks like..."
          rows={3}
          required
          minLength={10}
          className={`w-full h-20 border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none resize-none overflow-y-auto styled-scrollbar ${validationHints.some((h) => h.field === "description") ? "border-amber-500 focus:border-amber-500" : "border-border focus:border-foreground"}`}
        />
        {validationHints
          .filter((h) => h.field === "description")
          .map((hint, i) => (
            <p key={i} className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
              {hint.hint}
            </p>
          ))}
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">Due date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          required
          className="w-full h-10 border border-border bg-transparent px-3 text-sm focus:border-foreground focus:outline-none"
        />
      </div>
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs text-muted-foreground">Key Results</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={generateWithAI}
              disabled={!title.trim() || generating}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 disabled:opacity-50"
            >
              {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Generate
            </button>
            <button
              type="button"
              onClick={addKr}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>
        </div>
        {keyResults.length > 0 && (
          <ScrollArea className="h-[240px]">
            <div className="space-y-2 pr-3">
              {keyResults.map((kr, i) => (
                <div key={kr.id} className="group border border-border p-2 rounded-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] text-muted-foreground w-4 flex-shrink-0 pt-1">{i + 1}.</span>
                    <div className="flex-1 min-w-0 space-y-2">
                      <input
                        value={kr.title}
                        onChange={(e) => updateKr(kr.id, "title", e.target.value)}
                        placeholder="What will you measure?"
                        className="w-full h-7 bg-transparent text-foreground border-0 border-b border-border px-0 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
                      />
                      <div className="flex flex-wrap items-center gap-2 text-[10px]">
                        <span className="text-muted-foreground">from</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={kr.startValue}
                          onChange={(e) => updateKr(kr.id, "startValue", Number(e.target.value) || 0)}
                          className="w-12 h-6 bg-muted/50 text-foreground border border-border px-1 text-[10px] text-center focus:border-foreground focus:outline-none"
                        />
                        <span className="text-muted-foreground">to</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={kr.targetValue}
                          onChange={(e) => updateKr(kr.id, "targetValue", Number(e.target.value) || 0)}
                          className="w-12 h-6 bg-muted/50 text-foreground border border-border px-1 text-[10px] text-center focus:border-foreground focus:outline-none"
                        />
                        <select
                          value={kr.unit}
                          onChange={(e) => updateKr(kr.id, "unit", e.target.value)}
                          className="h-6 bg-muted/50 text-foreground border border-border px-1 text-[10px] focus:border-foreground focus:outline-none cursor-pointer"
                        >
                          <option value="%">%</option>
                          <option value="#">#</option>
                          <option value="$">$</option>
                          <option value="hrs">hrs</option>
                          <option value="users">users</option>
                          <option value="score">score</option>
                          <option value="deals">deals</option>
                          <option value="pts">pts</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeKr(kr.id)}
                      className="p-1 text-muted-foreground hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )

  const footerContent = (
    <div className="flex justify-end gap-3 select-none">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
      >
        Cancel <kbd className="px-1 py-0.5 bg-muted font-mono text-[10px]">Esc</kbd>
      </button>
      <button
        type="submit"
        disabled={loading || !title.trim() || !description.trim()}
        className="px-4 py-2 bg-foreground text-background text-sm disabled:opacity-50"
      >
        {loading
          ? isEditing
            ? "Updating..."
            : "Creating..."
          : isEditing
            ? "Update"
            : `Create${keyResults.filter((k) => k.title.trim()).length > 0 ? ` (${keyResults.filter((k) => k.title.trim()).length})` : ""}`}
      </button>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="!mt-0 h-[100dvh] !max-h-[100dvh] flex flex-col rounded-none">
          <DrawerHeader className="pb-2 select-none flex-shrink-0 pt-2">
            <DrawerTitle className="text-sm font-medium">{isEditing ? "Edit objective" : "New objective"}</DrawerTitle>
          </DrawerHeader>
          <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
            <div className="px-4 flex-1">{formFields}</div>
            <div className="px-4 py-4 border-t border-border flex-shrink-0 bg-background">{footerContent}</div>
          </form>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        className="w-full max-w-md max-h-[85vh] flex flex-col border border-border bg-background"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-5 pb-0 select-none flex-shrink-0">
          <span className="font-medium text-sm">{isEditing ? "Edit objective" : "New objective"}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
            <kbd className="px-1 py-0.5 bg-muted font-mono text-[10px]">Esc</kbd>
          </button>
        </div>
        <div className="px-5 py-4 flex-1">{formFields}</div>
        <div className="px-5 py-4 border-t border-border flex-shrink-0 bg-background">{footerContent}</div>
      </form>
    </div>
  )
}

function ReportModal({
  objective,
  onClose,
  onDone,
  devMode,
  onDevUpdate,
  orgId,
}: {
  objective: ObjectiveWithProgress
  onClose: () => void
  onDone: () => void
  devMode?: boolean
  onDevUpdate?: (obj: ObjectiveWithProgress) => void
  orgId: string
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(objective.key_results.map((kr) => [kr.id, kr.current_value]))
  )
  const [note, setNote] = useState("")

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    if (devMode && onDevUpdate) {
      onDevUpdate({
        ...objective,
        key_results: objective.key_results.map((kr) => ({ ...kr, current_value: values[kr.id] ?? kr.current_value })),
        overall_progress: (() => {
          const pcts = objective.key_results.map((kr) => {
            const newVal = values[kr.id] ?? kr.current_value
            if (kr.target_value === 0) return 0
            return newVal <= kr.target_value
              ? Math.min((newVal / kr.target_value) * 100, 100)
              : Math.min((kr.target_value / newVal) * 100, 100)
          })
          pcts.sort((a, b) => a - b)
          const m = Math.floor(pcts.length / 2)
          return pcts.length === 0 ? 0 : pcts.length % 2 !== 0 ? pcts[m] : (pcts[m - 1] + pcts[m]) / 2
        })(),
      })
      onDone()
      return
    }
    try {
      const { updateProgress } = await import("@/lib/actions")
      let updatedCount = 0
      for (const kr of objective.key_results) {
        const newValue = values[kr.id]
        if (newValue !== kr.current_value) {
          updatedCount++
          const result = await updateProgress(kr.id, newValue, orgId, note || undefined)
          if (result.error) {
            setError(result.error)
            setLoading(false)
            return
          }
        }
      }
      if (updatedCount === 0) {
        setError("No values were changed. Update at least one value to save progress.")
        setLoading(false)
        return
      }
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update progress")
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md border border-border bg-background p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 select-none">
          <span className="font-medium text-sm">Report Progress</span>
          <button onClick={onClose} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
            <kbd className="px-1 py-0.5 bg-muted font-mono text-[10px]">Esc</kbd>
          </button>
        </div>
        <p className="text-sm mb-4">{objective.title}</p>
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="p-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded">{error}</div>
          )}
          <div className="space-y-3">
            {objective.key_results.map((kr) => (
              <div key={kr.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{kr.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Target: {kr.target_value} {kr.unit}
                  </p>
                </div>
                <input
                  type="number"
                  value={values[kr.id] ?? kr.current_value}
                  onChange={(e) => setValues((prev) => ({ ...prev, [kr.id]: Number(e.target.value) }))}
                  className="w-20 h-8 border border-border bg-transparent px-2 text-sm text-right rounded-md"
                />
                <span className="text-xs text-muted-foreground w-12">{kr.unit}</span>
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What changed?"
              className="w-full h-9 border border-border bg-transparent px-3 text-sm rounded-md"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 select-none">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
            >
              Cancel <kbd className="px-1 py-0.5 bg-muted font-mono text-[10px]">Esc</kbd>
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-foreground text-background text-sm disabled:opacity-50 rounded-md"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md border border-border bg-background p-6 mx-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 select-none">
          <span className="font-medium text-sm">Keyboard Shortcuts</span>
          <button onClick={onClose} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
            <kbd className="px-1 py-0.5 bg-muted font-mono text-[10px]">Esc</kbd>
          </button>
        </div>
        <div className="space-y-4 text-xs">
          <div>
            <p className="text-muted-foreground mb-2 font-medium">Global</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>New objective</span>
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">⌘N</kbd>
              </div>
              <div className="flex justify-between">
                <span>Settings</span>
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">⌘,</kbd>
              </div>
              <div className="flex justify-between">
                <span>Cycle theme</span>
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">⌘.</kbd>
              </div>
              <div className="flex justify-between">
                <span>Close/Cancel</span>
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">Esc</kbd>
              </div>
              <div className="flex justify-between">
                <span>Show help</span>
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">?</kbd>
              </div>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-2 font-medium">Navigation</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Move down</span>
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">J</kbd> /{" "}
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">↓</kbd>
              </div>
              <div className="flex justify-between">
                <span>Move up</span>
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">K</kbd> /{" "}
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">↑</kbd>
              </div>
              <div className="flex justify-between">
                <span>Select 1-5</span>
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">1-5</kbd>
              </div>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-2 font-medium">Chart Period</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>1 Month</span>
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">M</kbd>
              </div>
              <div className="flex justify-between">
                <span>Quarter</span>
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">Q</kbd>
              </div>
              <div className="flex justify-between">
                <span>Year</span>
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">Y</kbd>
              </div>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-2 font-medium">Actions (with selection)</p>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Expand/Collapse</span>
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">Enter</kbd> /{" "}
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">X</kbd>
              </div>
              <div className="flex justify-between">
                <span>Report progress</span>
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">R</kbd>
              </div>
              <div className="flex justify-between">
                <span>View history</span>
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">H</kbd>
              </div>
              <div className="flex justify-between">
                <span>Edit</span>
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">E</kbd>
              </div>
              <div className="flex justify-between">
                <span>Delete</span>
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">D</kbd>
              </div>
              <div className="flex justify-between">
                <span>Open settings</span>
                <kbd className="px-1.5 py-0.5 bg-muted font-mono">O</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function HistoryModal({ objective, onClose }: { objective: ObjectiveWithProgress; onClose: () => void }) {
  const isMobile = useIsMobile()
  const sortedUpdates = objective.key_results
    .flatMap((kr) => (kr.progress_updates || []).map((u) => ({ ...u, krTitle: kr.title, unit: kr.unit })))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-3 select-none flex-shrink-0">
        <span className="font-medium text-sm">Progress History</span>
        {!isMobile && (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            <X className="h-3.5 w-3.5" />
            <kbd className="px-1 py-0.5 bg-muted font-mono text-[10px]">Esc</kbd>
          </button>
        )}
      </div>
      <ScrollArea className="flex-1 min-h-0">
        {sortedUpdates.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">No progress updates yet</div>
        ) : (
          <div className="relative pr-3">
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
            <div className="space-y-4">
              {sortedUpdates.map((u) => {
                const delta = u.new_value - u.previous_value
                const deltaColor = delta > 0 ? "text-green-500" : delta < 0 ? "text-red-500" : "text-muted-foreground"
                const deltaText = delta > 0 ? `+${delta}` : delta.toString()
                return (
                  <div key={u.id} className="relative pl-6">
                    <div className="absolute left-0 top-1 w-[11px] h-[11px] rounded-full border-2 border-border bg-background" />
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })},{" "}
                          {new Date(u.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                        <span className={`text-xs font-mono ${deltaColor}`}>{deltaText}</span>
                      </div>
                      <p className="text-xs truncate" title={u.krTitle}>
                        {u.krTitle}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {u.previous_value} → {u.new_value} {u.unit}
                      </p>
                      {u.note && <p className="text-xs text-muted-foreground mt-0.5 italic">"{u.note}"</p>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </ScrollArea>
    </div>
  )

  if (isMobile) {
    return (
      <Drawer open onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="!mt-0 h-[85dvh] !max-h-[85dvh] flex flex-col rounded-t-lg">
          <DrawerHeader className="pb-2 select-none flex-shrink-0 pt-2">
            <DrawerTitle className="text-sm font-medium sr-only">Progress History</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 flex-1 min-h-0 flex flex-col">{content}</div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[70vh] flex flex-col border border-border bg-background p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  )
}

export function Objectives({ user, org, orgRole, devMode, needsOrgName, userOrgs = [] }: Props) {
  const { view, editing, idx, hover, open: expanded, menu, objs, members, invites } = useStore()

  const [devObjectives, setDevObjectives] = useState<ObjectiveWithProgress[]>([])
  const { data: dbObjectives = [], mutate } = useSWR(devMode ? null : `objectives-${org.id}`, () =>
    fetchObjectives(org.id)
  )
  const supabase = createClient()
  const isAdmin = orgRole === "owner" || orgRole === "admin"

  useEffect(() => {
    if (!devMode && dbObjectives.length > 0) $.set("objs", dbObjectives)
  }, [dbObjectives, devMode])

  const objectives = devMode ? devObjectives : objs.length > 0 ? objs : dbObjectives

  useEffect(() => {
    if (view === "settings" && org && !devMode) {
      Promise.all([
        import("@/lib/actions").then((m) => m.getMembers(org.id)),
        import("@/lib/actions").then((m) => m.getInvites(org.id)),
      ]).then(([m, i]) => {
        $.set("members", m)
        $.set("invites", i)
      })
    }
  }, [view, org, devMode])

  const canAddObjective = objectives.length < MAX_OBJECTIVES

  const deleteObj = useCallback(
    async (id: string) => {
      if (devMode) {
        setDevObjectives((prev) => prev.filter((o) => o.id !== id))
        return
      }
      // Optimistic update - remove from UI immediately
      $.set(
        "objs",
        objs.filter((o) => o.id !== id)
      )
      const { deleteObjective } = await import("@/lib/actions")
      await deleteObjective(id, org.id)
      mutate()
    },
    [devMode, org.id, mutate, objs]
  )

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"

      if (e.key === "Escape") {
        e.preventDefault()
        if (view) return $.hide()
        if (menu) return $.set("menu", null)
        return $.set("idx", -1)
      }

      if (e.metaKey || e.ctrlKey) {
        if (e.key === "n" && canAddObjective && !view) $.show("objective")
        if (e.key === "," && view !== "settings") $.show("settings")
        if (e.key === ".") $.dark()
        return
      }

      if (inInput || view) return

      if (e.key === "?" || (e.shiftKey && e.key === "/")) return $.show("help")
      if (e.key === "m" || e.key === "M") return $.set("range", "1M")
      if (e.key === "q" || e.key === "Q") return $.set("range", "Q")
      if (e.key === "y" || e.key === "Y") return $.set("range", "Y")
      if (e.key >= "1" && e.key <= "5") return $.go(parseInt(e.key, 10))
      if (e.key === "j" || e.key === "ArrowDown") return $.nav(1)
      if (e.key === "k" || e.key === "ArrowUp") return $.nav(-1)
      if (e.key === "o" || e.key === "O") return $.show("settings")

      if (idx >= 0 && idx < objectives.length) {
        const obj = objectives[idx]
        if (e.key === "Enter" || e.key === " " || e.key === "x" || e.key === "X") return $.flip(obj.id)
        if (e.key === "r" || e.key === "R") return $.show("report", obj)
        if (e.key === "h" || e.key === "H") return $.show("history", obj)
        if ((e.key === "e" || e.key === "E") && isAdmin) return $.show("objective", obj)
        if ((e.key === "d" || e.key === "D" || e.key === "Delete" || e.key === "Backspace") && isAdmin) {
          if (confirm(`Delete "${obj.title}"?`)) deleteObj(obj.id)
        }
      }
    },
    [canAddObjective, objectives, idx, view, menu, isAdmin, deleteObj]
  )

  useEffect(() => {
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onKey])

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <header className="hidden md:block border-b border-border flex-shrink-0 select-none">
        <div className="mx-auto flex h-12 max-w-3xl lg:max-w-5xl xl:max-w-6xl items-center justify-between px-6 text-sm">
          <span className="flex items-center gap-2 font-medium">
            <Target className="h-4 w-4" />
            OKR
          </span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <OrgSwitcher
              currentOrg={org}
              orgs={userOrgs}
              onCreateOrg={() => {
                window.location.href = "/?new=1"
              }}
              onEditOrg={() => $.show("settings")}
            />
            <UserMenu
              email={user.email || ""}
              onSignOut={() => {
                supabase.auth.signOut()
                window.location.href = "/"
              }}
            />
          </div>
        </div>
      </header>

      <ThemeButton
        mobileOrg={org}
        mobileUserOrgs={userOrgs}
        mobileOpenOrgSettings={() => $.show("settings")}
        mobileSignOut={() => {
          supabase.auth.signOut()
          window.location.href = "/"
        }}
        mobileUserEmail={user.email}
      />

      <main className="flex-1 flex flex-col overflow-hidden pb-[104px] md:pb-0">
        <div className="mx-auto w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl px-6 pt-8 flex-shrink-0">
          <ProgressChart objectives={objectives} hoveredObj={hover} setHoveredObj={(id) => $.set("hover", id)} />
          <div className="hidden md:flex items-center justify-between mb-4 select-none">
            <h2 className="text-sm font-medium">Objectives</h2>
            <button
              onClick={() => canAddObjective && $.show("objective")}
              disabled={!canAddObjective}
              className={`flex items-center gap-1.5 text-xs ${canAddObjective ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50 cursor-not-allowed"}`}
              title={!canAddObjective ? `Maximum ${MAX_OBJECTIVES} objectives reached` : undefined}
            >
              <Plus className="h-3.5 w-3.5" /> New{" "}
              <kbd className="ml-1 px-1.5 py-0.5 bg-muted font-mono text-[10px]">⌘N</kbd>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mx-auto w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl px-6 pb-6">
          {objectives.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No objectives yet</p>
            </div>
          ) : (
            <div>
              {objectives.map((obj, i) => {
                const faded = hover !== null && hover !== obj.id
                const active = idx === i
                return (
                  <div
                    key={obj.id}
                    onMouseEnter={() => $.set("hover", obj.id)}
                    onMouseLeave={() => $.set("hover", null)}
                    className={`transition-opacity ${faded ? "opacity-30" : ""} ${active ? "ring-1 ring-foreground/20" : ""}`}
                  >
                    <div className="group flex items-center gap-3 px-4 py-2">
                      <button
                        onClick={() => $.flip(obj.id)}
                        className="text-muted-foreground hover:text-foreground"
                        title="Expand/Collapse (X)"
                      >
                        <ChevronRight
                          className={`h-4 w-4 transition-transform ${expanded.has(obj.id) ? "rotate-90" : ""}`}
                        />
                      </button>
                      {(() => {
                        const IconComponent = OKR_ICONS[i % OKR_ICONS.length]
                        return (
                          <IconComponent
                            strokeWidth={0}
                            className={`h-2.5 w-2.5 flex-shrink-0 ${CHART_FILL_CLASSES[i % CHART_FILL_CLASSES.length]}`}
                          />
                        )
                      })()}
                      <div className="min-w-0 max-w-md">
                        <span className="text-sm block truncate" title={obj.title}>
                          {obj.title}
                        </span>
                      </div>
                      <div className="flex-1 flex items-center justify-center">
                        {obj.key_results.length > 0 && (
                          <div className="flex items-center gap-6 text-xs font-mono text-muted-foreground">
                            {obj.key_results.slice(0, 4).map((kr) => (
                              <span
                                key={kr.id}
                                data-tooltip={kr.title}
                                className="hover:text-foreground transition-colors"
                              >
                                {kr.current_value}/{kr.target_value}
                                {kr.unit}
                              </span>
                            ))}
                            {obj.key_results.length > 4 && (
                              <span
                                data-tooltip={obj.key_results
                                  .slice(4)
                                  .map((kr) => kr.title)
                                  .join(", ")}
                                className="hover:text-foreground transition-colors"
                              >
                                +{obj.key_results.length - 4}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <span
                        data-tooltip="Overall progress"
                        className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors leading-none"
                      >
                        {obj.overall_progress.toFixed(0)}%
                      </span>
                      <button
                        onClick={() => $.show("report", obj)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors leading-none flex items-center gap-1"
                      >
                        report <kbd className="px-1 py-0.5 bg-muted font-mono text-[10px]">R</kbd>
                      </button>
                      <button
                        onClick={() => $.show("history", obj)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors leading-none flex items-center gap-1"
                      >
                        history <kbd className="px-1 py-0.5 bg-muted font-mono text-[10px]">H</kbd>
                      </button>
                      {isAdmin && (
                        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                          <button
                            onClick={() => $.set("menu", menu === obj.id ? null : obj.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {menu === obj.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => $.set("menu", null)} />
                              <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] bg-popover border border-border rounded-md shadow-md py-1">
                                <button
                                  onClick={() => {
                                    $.show("objective", obj)
                                    $.set("menu", null)
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted/50 flex items-center justify-between"
                                >
                                  <span>Edit</span>
                                  <kbd className="text-[10px] text-muted-foreground font-mono">E</kbd>
                                </button>
                                <button
                                  onClick={() => {
                                    deleteObj(obj.id)
                                    $.set("menu", null)
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-muted/50 flex items-center justify-between"
                                >
                                  <span>Delete</span>
                                  <kbd className="text-[10px] text-muted-foreground font-mono">D</kbd>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {expanded.has(obj.id) && (
                      <div className="px-4 pb-1 pl-11">
                        {obj.description && (
                          <p className="text-xs text-muted-foreground mb-1 truncate" title={obj.description}>
                            {obj.description}
                          </p>
                        )}
                        <div>
                          {obj.key_results.map((kr) => {
                            const p =
                              kr.target_value === 0
                                ? 0
                                : kr.current_value <= kr.target_value
                                  ? Math.min((kr.current_value / kr.target_value) * 100, 100)
                                  : Math.min((kr.target_value / kr.current_value) * 100, 100)
                            return (
                              <div key={kr.id} className="py-0.5 flex items-center gap-2">
                                <div className="w-8 text-[10px] font-mono text-muted-foreground text-right">
                                  {p.toFixed(0)}%
                                </div>
                                <div className="w-16 h-1 bg-muted flex-shrink-0">
                                  <div className="h-full bg-foreground/40" style={{ width: `${Math.min(p, 100)}%` }} />
                                </div>
                                <span className="flex-1 text-xs truncate">{kr.title}</span>
                                <span className="text-[10px] text-muted-foreground">
                                  {kr.current_value}/{kr.target_value} {kr.unit}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <div className="md:hidden fixed bottom-16 left-0 right-0 bg-background z-30 flex items-center justify-between px-4 h-10 select-none">
        <h2 className="text-sm font-medium">Objectives</h2>
        <button
          onClick={() => canAddObjective && $.show("objective")}
          disabled={!canAddObjective}
          className={`flex items-center gap-1.5 text-xs ${canAddObjective ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50 cursor-not-allowed"}`}
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>

      {view === "objective" && (
        <ObjectiveModal
          onClose={$.hide}
          onDone={() => {
            $.hide()
            if (!devMode) mutate()
          }}
          devMode={devMode}
          editingObjective={editing}
          onDevCreate={(obj) => setDevObjectives((p) => [obj, ...p])}
          onDevUpdate={(obj) => setDevObjectives((p) => p.map((o) => (o.id === obj.id ? obj : o)))}
          orgId={org.id}
        />
      )}
      {view === "report" && editing && (
        <ReportModal
          objective={editing}
          onClose={$.hide}
          onDone={() => {
            $.hide()
            if (!devMode) mutate()
          }}
          devMode={devMode}
          onDevUpdate={(obj) => setDevObjectives((p) => p.map((o) => (o.id === obj.id ? obj : o)))}
          orgId={org.id}
        />
      )}
      {view === "settings" && (
        <OrgSettings
          org={org}
          members={members}
          invites={invites}
          currentUserRole={orgRole}
          onClose={$.hide}
          onInvite={async (email, role) => {
            const { sendInvite, getInvites } = await import("@/lib/actions")
            const r = await sendInvite(org.id, email, role)
            if (!r.error) $.set("invites", await getInvites(org.id))
            return r
          }}
          onRemoveMember={async (memberId) => {
            const { removeMember, getMembers } = await import("@/lib/actions")
            const r = await removeMember(org.id, memberId)
            if (!r.error) $.set("members", await getMembers(org.id))
            return r
          }}
          onUpdateMemberRole={async (memberId, role) => {
            const { setMemberRole, getMembers } = await import("@/lib/actions")
            const r = await setMemberRole(org.id, memberId, role)
            if (!r.error) $.set("members", await getMembers(org.id))
            return r
          }}
          onUpdateMemberName={async (memberId, name) => {
            const { renameMember, getMembers } = await import("@/lib/actions")
            const r = await renameMember(org.id, memberId, name)
            if (!r.error) $.set("members", await getMembers(org.id))
            return r
          }}
          onTransferOwnership={async (memberId) => {
            const { transferOwnership, getMembers } = await import("@/lib/actions")
            const r = await transferOwnership(org.id, memberId)
            if (!r.error) $.set("members", await getMembers(org.id))
            return r
          }}
          onCancelInvite={async (inviteId) => {
            const { cancelInvite, getInvites } = await import("@/lib/actions")
            const r = await cancelInvite(org.id, inviteId)
            if (!r.error) $.set("invites", await getInvites(org.id))
            return r
          }}
          onUpdateSettings={async (s) => (await import("@/lib/actions")).updateOrg(org.id, s)}
          onDeleteOrg={async () => (await import("@/lib/actions")).deleteOrg(org.id)}
          highlightOrgName={needsOrgName}
        />
      )}
      {view === "help" && <HelpModal onClose={$.hide} />}
      {view === "history" && editing && <HistoryModal objective={editing} onClose={$.hide} />}
    </div>
  )
}
