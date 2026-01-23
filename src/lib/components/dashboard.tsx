"use client"

import React, { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import type { Objective, KeyResult, ObjectiveWithProgress, Organization, OrgMember, OrgInvite } from "@/lib/types"
import useSWR from "swr"
import { Sun, Moon, Monitor, Target, ChevronRight, Plus, Trash2, Sparkles, Loader2, X, MoreVertical, Circle, Square, Triangle, Diamond, Hexagon } from "lucide-react"
import { useAppStore } from "@/lib/store"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/lib/components/ui/drawer"
import { useIsMobile } from "@/lib/hooks/use-mobile"
import { ChartContainer, ChartTooltip } from "@/lib/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts"
import { OrgSettings } from "@/lib/components/org-settings"
import { OrgSwitcher } from "@/lib/components/org-switcher"
import { ScrollArea } from "@/lib/components/ui/scroll-area"

// Colors for OKR lines
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

// Tailwind fill classes for icons (must match CHART_COLORS order)
const CHART_FILL_CLASSES = [
  "fill-chart-1",
  "fill-chart-2",
  "fill-chart-3",
  "fill-chart-4",
  "fill-chart-5",
]

// Icons for OKRs - clean geometric shapes, assigned by index (max 5 objectives)
const OKR_ICONS = [Circle, Square, Diamond, Triangle, Hexagon] as const
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

async function fetchData() {
  const supabase = createClient()
  const { data } = await supabase.from("objectives").select(`*, key_results (*, progress_updates (*))`).order("created_at", { ascending: false })
  if (!data) return []
  return data.map(obj => {
    const krs = (obj as Objective & { key_results: (KeyResult & { progress_updates: any[] })[] }).key_results || []
    const krsWithSortedUpdates = krs.map(kr => ({
      ...kr,
      progress_updates: (kr.progress_updates || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }))
  // Calculate progress for each KR (handles both increase and decrease metrics)
  const percentages = krs.map(k => {
    if (k.target_value === 0) return 0
    // If current <= target: normal progress (increase metric)
    // If current > target: inverse progress (decrease metric, e.g., reduce response time)
    return k.current_value <= k.target_value
      ? Math.min((k.current_value / k.target_value) * 100, 100)
      : Math.min((k.target_value / k.current_value) * 100, 100)
  })
  // Use median instead of average
  percentages.sort((a, b) => a - b)
  const mid = Math.floor(percentages.length / 2)
  const p = percentages.length === 0 ? 0
    : percentages.length % 2 !== 0 ? percentages[mid]
    : (percentages[mid - 1] + percentages[mid]) / 2
  return { ...obj, key_results: krsWithSortedUpdates, overall_progress: Math.min(p, 100) } as ObjectiveWithProgress
  })
}

// Theme button component
function ThemeBtn({ mobileOrg, mobileUserOrgs, mobileOpenOrgSettings, mobileSignOut, mobileUserEmail }: { mobileOrg?: Organization; mobileUserOrgs?: (Organization & { role?: string })[]; mobileOpenOrgSettings?: () => void; mobileSignOut?: () => void; mobileUserEmail?: string }) {
  const { theme, setTheme } = useAppStore()
  const [open, setOpen] = useState(false)

  // Initialize theme from store on mount
  useEffect(() => {
    const t = theme
    if (t === "system") {
      document.documentElement.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches)
    } else {
      document.documentElement.classList.toggle("dark", t === "dark")
    }
  }, [theme])

  const select = (v: "light" | "dark" | "system") => {
    setTheme(v)
    setOpen(false)
  }

  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor
  return (
    <>
      {/* Mobile top bar - OKR left, theme right */}
      <div className="md:hidden fixed top-3 left-3 z-40 select-none flex items-center gap-2">
        <Target className="h-4 w-4" />
        <span className="text-sm font-medium">OKR</span>
      </div>
      <div className="md:hidden fixed top-3 right-3 z-40 select-none">
        <div className="relative">
          <button onClick={() => setOpen(!open)} className="w-7 h-7 flex items-center justify-center border border-border bg-background text-muted-foreground hover:text-foreground"><Icon className="h-3.5 w-3.5" /></button>
          {open && (
            <div className="absolute top-full right-0 mt-1 border border-border bg-background p-1 flex flex-col min-w-[100px]">
              {(["light", "dark", "system"] as const).map(v => (
                <button key={v} onClick={() => select(v)} className={`px-3 py-1.5 text-xs text-left hover:bg-muted ${theme === v ? "text-foreground" : "text-muted-foreground"}`}>{v}</button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Mobile footer */}
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
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {mobileUserEmail && <span className="max-w-[100px] truncate">{mobileUserEmail}</span>}
          <button onClick={() => { mobileSignOut?.() }} className="hover:text-foreground">sign out</button>
        </div>
      </nav>
      {/* Desktop theme + help buttons */}
      <div className="hidden md:flex fixed bottom-4 right-4 z-40 select-none gap-1">
        <button onClick={() => useAppStore.getState().openHelp()} className="w-7 h-7 flex items-center justify-center border border-border bg-background text-muted-foreground hover:text-foreground text-[10px] font-mono">?</button>
        <div className="relative">
          <button onClick={() => setOpen(!open)} className="w-7 h-7 flex items-center justify-center border border-border bg-background text-muted-foreground hover:text-foreground"><Icon className="h-3.5 w-3.5" /></button>
          {open && (
            <div className="absolute bottom-full right-0 mb-2 border border-border bg-background p-1 flex flex-col min-w-[100px]">
              {(["light", "dark", "system"] as const).map(v => (
                <button key={v} onClick={() => select(v)} className={`px-3 py-1.5 text-xs text-left hover:bg-muted ${theme === v ? "text-foreground" : "text-muted-foreground"}`}>{v}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Period types for chart view
type ChartPeriod = "1M" | "Q" | "Y"

// Dashboard charts component showing historical progress
function DashboardCharts({ objectives, hoveredObj, setHoveredObj }: {
  objectives: ObjectiveWithProgress[];
  hoveredObj: string | null;
  setHoveredObj: (id: string | null) => void;
}) {
  const { chartPeriod: period, setChartPeriod: setPeriod } = useAppStore()

  // Calculate period bounds - start from earliest objective, extend by period
  const getPeriodBounds = () => {
    const now = new Date()
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    // Find earliest objective creation date
    let earliestDate: Date = new Date(todayOnly)
    objectives.forEach(obj => {
      const created = new Date(obj.created_at)
      created.setHours(0, 0, 0, 0)
      if (created < earliestDate) {
        earliestDate = created
      }
    })

    // Calculate end date based on period from earliest objective
    let periodEnd: Date
    switch (period) {
      case "1M":
        periodEnd = new Date(earliestDate)
        periodEnd.setMonth(periodEnd.getMonth() + 1)
        break
      case "Q":
        periodEnd = new Date(earliestDate)
        periodEnd.setMonth(periodEnd.getMonth() + 3)
        break
      case "Y":
        periodEnd = new Date(earliestDate)
        periodEnd.setFullYear(periodEnd.getFullYear() + 1)
        break
    }

    // End date is the later of: period end or today
    const endDate = periodEnd > todayOnly ? periodEnd : todayOnly

    return { startDate: earliestDate, endDate, todayOnly }
  }

  // Generate progress data for each objective over time
  const generateProgressData = () => {
    if (objectives.length === 0) return []

    const { startDate, endDate, todayOnly } = getPeriodBounds()

    // Generate regular interval points based on period
    const points: Date[] = []
    const current = new Date(startDate)

    // Determine interval based on period (daily granularity for smooth lines)
    const intervalDays = 1

    while (current <= endDate) {
      points.push(new Date(current))
      current.setDate(current.getDate() + intervalDays)
    }

    // Ensure end date (today) is included
    if (points[points.length - 1]?.getTime() !== endDate.getTime()) {
      points.push(new Date(endDate))
    }

    // Also add key dates: objective creation dates and progress update dates
    objectives.forEach(obj => {
      const created = new Date(obj.created_at)
      created.setHours(0, 0, 0, 0)
      if (created >= startDate && created <= endDate) {
        const exists = points.some(p => Math.abs(p.getTime() - created.getTime()) < 86400000)
        if (!exists) points.push(created)
      }

      obj.key_results.forEach(kr => {
        const updates = (kr as any).progress_updates || []
        updates.forEach((u: any) => {
          const updateDate = new Date(u.created_at)
          updateDate.setHours(0, 0, 0, 0)
          if (updateDate >= startDate && updateDate <= endDate) {
            const exists = points.some(p => Math.abs(p.getTime() - updateDate.getTime()) < 86400000)
            if (!exists) points.push(updateDate)
          }
        })
      })
    })

    // Sort all points chronologically
    points.sort((a, b) => a.getTime() - b.getTime())

    // Helper to calculate progress at a given date
    const calculateProgressAtDate = (obj: ObjectiveWithProgress, targetDate: Date): number => {
      const krProgresses: number[] = []
      obj.key_results.forEach(kr => {
        const updates = (kr as any).progress_updates || []
        const relevantUpdates = updates.filter((u: any) => {
          const uDate = new Date(u.created_at)
          uDate.setHours(0, 0, 0, 0)
          return uDate <= targetDate
        })
        if (relevantUpdates.length > 0) {
          const latestUpdate = relevantUpdates.sort((a: any, b: any) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]
          const val = latestUpdate.new_value
          const target = kr.target_value
          if (target === 0) {
            krProgresses.push(0)
          } else if (val <= target) {
            krProgresses.push(Math.min((val / target) * 100, 100))
          } else {
            krProgresses.push(Math.min((target / val) * 100, 100))
          }
        } else {
          krProgresses.push(0)
        }
      })
      if (krProgresses.length === 0) return 0
      krProgresses.sort((a, b) => a - b)
      const mid = Math.floor(krProgresses.length / 2)
      return krProgresses.length % 2 !== 0
        ? krProgresses[mid]
        : (krProgresses[mid - 1] + krProgresses[mid]) / 2
    }

    // Build data for each point
    return points.map(date => {
      const entry: Record<string, number | string | null> = {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        _timestamp: date.getTime()
      }

      objectives.forEach((obj, idx) => {
        const objCreated = new Date(obj.created_at)
        objCreated.setHours(0, 0, 0, 0)
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

        if (dateOnly > todayOnly) {
          // Future date - don't show line
          entry[`obj${idx}`] = null
        } else if (dateOnly < objCreated) {
          // Before objective was created - don't show line
          entry[`obj${idx}`] = null
        } else if (dateOnly.getTime() === objCreated.getTime()) {
          // At objective start date - begin at 0%
          entry[`obj${idx}`] = 0
        } else if (objCreated < startDate && dateOnly.getTime() === startDate.getTime()) {
          // Objective started before period - show progress at period start
          entry[`obj${idx}`] = calculateProgressAtDate(obj, startDate)
        } else {
          // Calculate progress at this point
          entry[`obj${idx}`] = calculateProgressAtDate(obj, dateOnly)
        }
      })

      return entry
    })
  }

  const progressData = React.useMemo(() => generateProgressData(), [period, objectives])

  // Colors for different objectives
  const colors = CHART_COLORS

  // Build chart config dynamically
  const chartConfig: Record<string, { label: string; color?: string }> = {
    date: { label: "Date" },
  }
  objectives.forEach((obj, idx) => {
    chartConfig[`obj${idx}`] = {
      label: obj.title.length > 20 ? obj.title.slice(0, 20) + "..." : obj.title,
      color: colors[idx % colors.length],
    }
  })

  return (
    <div className="mb-8">
      {/* Status chart */}
      {objectives.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Status</span>
            <div className="flex items-center gap-0.5 text-xs">
              {(["1M", "Q", "Y"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-1.5 py-0.5 transition-colors flex items-center gap-1 ${period === p ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {p}
                  <kbd className={`px-1 py-0.5 font-mono text-[10px] ${period === p ? "bg-background/20" : "bg-muted"}`}>{p === "1M" ? "M" : p}</kbd>
                </button>
              ))}
            </div>
          </div>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <LineChart data={progressData} margin={{ top: 10, right: 40, left: 0, bottom: 0 }} style={{ transition: 'none' }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
                interval={progressData.length <= 14 ? 0 : Math.max(1, Math.floor(progressData.length / 10))}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                className="text-muted-foreground"
                orientation="left"
                width={40}
                reversed
              />
              <ChartTooltip
                cursor={false}
                trigger="hover"
                content={() => {
                  if (!hoveredObj) return null
                  const obj = objectives.find(o => o.id === hoveredObj)
                  if (!obj) return null
                  return (
                    <div className="bg-background border border-border p-2 text-xs">
                      <div className="flex items-center justify-between gap-4">
                        <span className="font-medium truncate max-w-48">{obj.title}</span>
                        <span className="text-muted-foreground font-mono">{Math.round(obj.overall_progress)}%</span>
                      </div>
                      {obj.key_results.length > 0 && (
                        <div className="mt-1 space-y-0.5 text-muted-foreground font-mono">
                          {obj.key_results.map((kr) => (
                            <div key={kr.id}>{kr.current_value}/{kr.target_value}{kr.unit}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                }}
              />
              {objectives.map((obj, idx) => {
                const isHovered = hoveredObj === obj.id
                const isOtherHovered = hoveredObj !== null && hoveredObj !== obj.id
                const IconComponent = OKR_ICONS[idx % OKR_ICONS.length]
                const color = colors[idx % colors.length]
                // Find first non-null data point index for this objective
                const startIdx = progressData.findIndex(d => (d as any)[`obj${idx}`] !== null && (d as any)[`obj${idx}`] !== undefined)
                // Find last non-null data point index (today or last data point)
                const endIdx = progressData.reduce((last, d, i) => (d as any)[`obj${idx}`] !== null ? i : last, -1)
                return (
                  <Line
                    key={obj.id}
                    type="monotone"
                    dataKey={`obj${idx}`}
                    stroke={color}
                    strokeWidth={3}
                    strokeOpacity={isOtherHovered ? 0.2 : 1}
                    connectNulls={false}
                    isAnimationActive={false}
                    dot={(props: any) => {
                      const opacity = isOtherHovered ? 0.2 : 1
                      const size = 8
                      // Show icon at start point (always visible)
                      if (props.index === startIdx && props.cx && props.cy) {
                        return (
                          <foreignObject
                            key={props.key}
                            x={props.cx - size / 2}
                            y={props.cy - size / 2}
                            width={size}
                            height={size}
                            opacity={opacity}
                          >
                            <IconComponent strokeWidth={0} className={`w-2 h-2 ${CHART_FILL_CLASSES[idx % CHART_FILL_CLASSES.length]}`} />
                          </foreignObject>
                        )
                      }
                      // Show dot at end point (always visible)
                      if (props.index === endIdx && props.cx && props.cy) {
                        return (
                          <circle
                            key={props.key}
                            cx={props.cx}
                            cy={props.cy}
                            r={size / 2}
                            fill={color}
                            opacity={opacity}
                          />
                        )
                      }
                      return <circle key={props.key} r={0} />
                    }}
                    activeDot={false}
                    name={obj.title.length > 20 ? obj.title.slice(0, 20) + "..." : obj.title}
                    onMouseEnter={() => setHoveredObj(obj.id)}
                    onMouseLeave={() => setHoveredObj(null)}
                    className="cursor-pointer"
                    strokeLinecap="round"
                  />
                )
              })}
            </LineChart>
          </ChartContainer>
        </div>
      )}
    </div>
  )
}

// Objective Modal component
function ObjectiveModal({ onClose, onDone, devMode, onDevCreate, editingObjective, onDevUpdate }: { 
  onClose: () => void; 
  onDone: () => void; 
  devMode?: boolean; 
  onDevCreate?: (obj: Objective) => void;
  editingObjective?: Objective | null;
  onDevUpdate?: (obj: Objective) => void;
}) {
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [title, setTitle] = useState(editingObjective?.title || "")
  const [description, setDescription] = useState(editingObjective?.description || "")
  const [keyResults, setKeyResults] = useState<{ id: string; title: string; targetValue: number; unit: string; startValue: number }[]>(
    editingObjective?.key_results.map(kr => ({
      id: kr.id,
      title: kr.title,
      targetValue: kr.target_value,
      unit: kr.unit,
      startValue: kr.current_value,
    })) || []
  )
  const [evaluation, setEvaluation] = useState<string | null>(null)
  const [validationHints, setValidationHints] = useState<{ field: "title" | "description"; issue: string; hint: string }[]>([])

  const date = new Date()
  date.setMonth(date.getMonth() + 3)
  const [endDate, setEndDate] = useState(editingObjective?.end_date || date.toISOString().split("T")[0])
  
  const isEditing = !!editingObjective

  function addKr() {
    setKeyResults([...keyResults, { id: crypto.randomUUID(), title: "", targetValue: 100, unit: "%", startValue: 0 }])
    setEvaluation(null)
  }

  function updateKr(id: string, field: string, value: string | number) {
    setKeyResults(keyResults.map(kr => kr.id === id ? { ...kr, [field]: value } : kr))
    setEvaluation(null)
  }

  function removeKr(id: string) {
    setKeyResults(keyResults.filter(kr => kr.id !== id))
    setEvaluation(null)
  }

  async function generateWithAI() {
    if (!title.trim()) return
    setGenerating(true)
    setValidationHints([])
    try {
      // First validate the objective
      const validateRes = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "validateObjective", data: { title, description } }),
      })
      const validateData = await validateRes.json()
      if (validateData.error) {
        console.error("Failed to validate objective:", validateData.error)
        setGenerating(false)
        return
      }

      // If validation failed, show hints and don't generate
      if (!validateData.isValid && validateData.issues?.length > 0) {
        setValidationHints(validateData.issues)
        setGenerating(false)
        return
      }

      // Validation passed, proceed to generate
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generateKeyResults", data: { title, description } }),
      })
      const data = await res.json()
      if (data.error) {
        console.error("Failed to generate key results:", data.error)
        return
      }
      const generated = data.keyResults || []
      if (generated.length === 0) return
      const krs = generated.map((kr: { title: string; targetValue: number; unit: string; startValue: number }) => ({
        id: crypto.randomUUID(),
        title: kr.title,
        targetValue: kr.targetValue,
        unit: kr.unit,
        startValue: kr.startValue,
      }))
      setKeyResults(krs)
      setValidationHints([]) // Clear hints on success
    } catch (e) {
      console.error("Failed to generate key results", e)
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
        // Dev mode: update existing objective
        const updatedObjective: Objective = {
          ...editingObjective,
          title,
          description,
          end_date: endDate,
          updated_at: new Date().toISOString(),
          key_results: keyResults.filter(kr => kr.title.trim()).map(kr => ({
            id: kr.id,
            objective_id: editingObjective.id,
            title: kr.title,
            target_value: kr.targetValue,
            current_value: kr.startValue,
            unit: kr.unit,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
        }
        onDevUpdate(updatedObjective)
        onDone()
        return
      } else if (onDevCreate) {
        // Dev mode: create local objective
        const newObjective: Objective = {
          id: crypto.randomUUID(),
          user_id: "dev",
          org_id: null,
          title,
          description,
          status: "active",
          end_date: endDate,
          is_public: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          key_results: keyResults.filter(kr => kr.title.trim()).map(kr => ({
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
        }
        onDevCreate(newObjective)
        onDone()
        return
      }
    }
    
    if (isEditing && editingObjective) {
      const { updateObjectiveWithKeyResults } = await import("@/lib/actions")
      await updateObjectiveWithKeyResults({
        id: editingObjective.id,
        title,
        description,
        endDate,
        keyResults: keyResults.filter(kr => kr.title.trim()).map(kr => ({
          id: kr.id,
          title: kr.title,
          targetValue: kr.targetValue,
          unit: kr.unit,
          startValue: kr.startValue,
        })),
      })
    } else {
      const { createObjectiveWithKeyResults } = await import("@/lib/actions")
      await createObjectiveWithKeyResults({
        title,
        description,
        endDate,
        keyResults: keyResults.filter(kr => kr.title.trim()).map(kr => ({
          title: kr.title,
          targetValue: kr.targetValue,
          unit: kr.unit,
          startValue: kr.startValue,
        })),
      })
    }
    onDone()
  }

  const formFields = (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">What do you want to achieve?</label>
        <input
          value={title}
          onChange={e => {
            setTitle(e.target.value)
            setValidationHints(prev => prev.filter(h => h.field !== "title"))
          }}
          placeholder="e.g. Increase revenue by 50%"
          required
          autoFocus
          className={`w-full h-10 border bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:outline-none ${validationHints.some(h => h.field === "title") ? "border-amber-500 focus:border-amber-500" : "border-border focus:border-foreground"}`}
        />
        {validationHints.filter(h => h.field === "title").map((hint, i) => (
          <p key={i} className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">{hint.hint}</p>
        ))}
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">Why is this important?</label>
        <textarea
          value={description}
          onChange={e => {
            setDescription(e.target.value)
            setValidationHints(prev => prev.filter(h => h.field !== "description"))
          }}
          placeholder="Provide context: why this matters, what success looks like..."
          rows={3}
          required
          minLength={10}
          className={`w-full h-20 border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none resize-none overflow-y-auto styled-scrollbar ${validationHints.some(h => h.field === "description") ? "border-amber-500 focus:border-amber-500" : "border-border focus:border-foreground"}`}
        />
        {validationHints.filter(h => h.field === "description").map((hint, i) => (
          <p key={i} className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">{hint.hint}</p>
        ))}
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">Due date</label>
        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required className="w-full h-10 border border-border bg-transparent px-3 text-sm focus:border-foreground focus:outline-none" />
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
            <button type="button" onClick={addKr} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
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
                        onChange={e => updateKr(kr.id, "title", e.target.value)} 
                        placeholder="What will you measure?" 
                        className="w-full h-7 bg-transparent text-foreground border-0 border-b border-border px-0 text-xs placeholder:text-muted-foreground focus:border-foreground focus:outline-none" 
                      />
                      <div className="flex flex-wrap items-center gap-2 text-[10px]">
                        <span className="text-muted-foreground">from</span>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          value={kr.startValue} 
                          onChange={e => updateKr(kr.id, "startValue", Number(e.target.value) || 0)} 
                          className="w-12 h-6 bg-muted/50 text-foreground border border-border px-1 text-[10px] text-center focus:border-foreground focus:outline-none" 
                        />
                        <span className="text-muted-foreground">to</span>
                        <input 
                          type="text"
                          inputMode="numeric"
                          value={kr.targetValue} 
                          onChange={e => updateKr(kr.id, "targetValue", Number(e.target.value) || 0)} 
                          className="w-12 h-6 bg-muted/50 text-foreground border border-border px-1 text-[10px] text-center focus:border-foreground focus:outline-none" 
                        />
                        <select 
                          value={kr.unit} 
                          onChange={e => updateKr(kr.id, "unit", e.target.value)} 
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
                    <button type="button" onClick={() => removeKr(kr.id)} className="p-1 text-muted-foreground hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100 flex-shrink-0">
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
      <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
        Cancel <kbd className="px-1 py-0.5 bg-muted font-mono text-[10px]">Esc</kbd>
      </button>
      <button type="submit" disabled={loading || !title.trim() || !description.trim()} className="px-4 py-2 bg-foreground text-background text-sm disabled:opacity-50">
        {loading ? (isEditing ? "Updating..." : "Creating...") : isEditing ? "Update" : `Create${keyResults.filter(k => k.title.trim()).length > 0 ? ` (${keyResults.filter(k => k.title.trim()).length})` : ""}`}
      </button>
    </div>
  )

  // Mobile: Drawer from bottom
  if (isMobile) {
    return (
      <Drawer open onOpenChange={open => !open && onClose()}>
        <DrawerContent className="!mt-0 h-[100dvh] !max-h-[100dvh] flex flex-col rounded-none">
          <DrawerHeader className="pb-2 select-none flex-shrink-0 pt-2">
            <DrawerTitle className="text-sm font-medium">{isEditing ? "Edit objective" : "New objective"}</DrawerTitle>
          </DrawerHeader>
          <form onSubmit={submit} className="flex flex-col flex-1 min-h-0">
            <div className="px-4 flex-1">
              {formFields}
            </div>
            <div className="px-4 py-4 border-t border-border flex-shrink-0 bg-background">
              {footerContent}
            </div>
          </form>
        </DrawerContent>
      </Drawer>
    )
  }

  // Desktop: Centered dialog
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form onSubmit={submit} className="w-full max-w-md max-h-[85vh] flex flex-col border border-border bg-background" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-5 pb-0 select-none flex-shrink-0">
          <span className="font-medium text-sm">{isEditing ? "Edit objective" : "New objective"}</span>
          <button type="button" onClick={onClose} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
            <kbd className="px-1 py-0.5 bg-muted font-mono text-[10px]">Esc</kbd>
          </button>
        </div>
        <div className="px-5 py-4 flex-1">
          {formFields}
        </div>
        <div className="px-5 py-4 border-t border-border flex-shrink-0 bg-background">
          {footerContent}
        </div>
      </form>
    </div>
  )
}

// Key Result Modal
// Report Progress Modal
function ReportModal({ objective, onClose, onDone, devMode, onDevUpdate }: {
  objective: Objective;
  onClose: () => void;
  onDone: () => void;
  devMode?: boolean;
  onDevUpdate?: (obj: Objective) => void;
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(objective.key_results.map(kr => [kr.id, kr.current_value]))
  )
  const [note, setNote] = useState("")

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (devMode && onDevUpdate) {
      // Dev mode: update local state
      const updatedObj: Objective = {
        ...objective,
        key_results: objective.key_results.map(kr => ({
          ...kr,
          current_value: values[kr.id] ?? kr.current_value,
        })),
        overall_progress: (() => {
          const pcts = objective.key_results.map(kr => {
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
      }
      onDevUpdate(updatedObj)
      onDone()
      return
    }

    try {
      const { updateKeyResultProgress } = await import("@/lib/actions")
      let updatedCount = 0
      for (const kr of objective.key_results) {
        const newValue = values[kr.id]
        console.log(`KR "${kr.title}": current=${kr.current_value}, new=${newValue}, changed=${newValue !== kr.current_value}`)
        if (newValue !== kr.current_value) {
          updatedCount++
          const result = await updateKeyResultProgress(kr.id, newValue, note || undefined)
          if (result.error) {
            setError(result.error)
            setLoading(false)
            return
          }
        }
      }
      console.log(`Updated ${updatedCount} key results`)
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
      <div className="w-full max-w-md border border-border bg-background p-6 mx-4" onClick={e => e.stopPropagation()}>
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
            <div className="p-2 text-xs text-red-500 bg-red-500/10 border border-red-500/20 rounded">
              {error}
            </div>
          )}
          <div className="space-y-3">
            {objective.key_results.map(kr => (
              <div key={kr.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{kr.title}</p>
                  <p className="text-[10px] text-muted-foreground">Target: {kr.target_value} {kr.unit}</p>
                </div>
                <input
                  type="number"
                  value={values[kr.id] ?? kr.current_value}
                  onChange={e => setValues(prev => ({ ...prev, [kr.id]: Number(e.target.value) }))}
                  className="w-20 h-8 border border-border bg-transparent px-2 text-sm text-right rounded-md"
                />
                <span className="text-xs text-muted-foreground w-12">{kr.unit}</span>
              </div>
            ))}
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Note (optional)</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="What changed?" className="w-full h-9 border border-border bg-transparent px-3 text-sm rounded-md" />
          </div>
          <div className="flex justify-end gap-3 pt-2 select-none">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground flex items-center gap-2">
              Cancel <kbd className="px-1 py-0.5 bg-muted font-mono text-[10px]">Esc</kbd>
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-foreground text-background text-sm disabled:opacity-50 rounded-md">{loading ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Help modal with keyboard shortcuts
function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md border border-border bg-background p-6 mx-4" onClick={e => e.stopPropagation()}>
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
              <div className="flex justify-between"><span>New objective</span><kbd className="px-1.5 py-0.5 bg-muted font-mono">{"⌘N"}</kbd></div>
              <div className="flex justify-between"><span>Settings</span><kbd className="px-1.5 py-0.5 bg-muted font-mono">{"⌘,"}</kbd></div>
              <div className="flex justify-between"><span>Cycle theme</span><kbd className="px-1.5 py-0.5 bg-muted font-mono">{"⌘."}</kbd></div>
              <div className="flex justify-between"><span>Close/Cancel</span><kbd className="px-1.5 py-0.5 bg-muted font-mono">Esc</kbd></div>
              <div className="flex justify-between"><span>Show help</span><kbd className="px-1.5 py-0.5 bg-muted font-mono">?</kbd></div>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-2 font-medium">Navigation</p>
            <div className="space-y-1">
              <div className="flex justify-between"><span>Move down</span><kbd className="px-1.5 py-0.5 bg-muted font-mono">J</kbd> / <kbd className="px-1.5 py-0.5 bg-muted font-mono">↓</kbd></div>
              <div className="flex justify-between"><span>Move up</span><kbd className="px-1.5 py-0.5 bg-muted font-mono">K</kbd> / <kbd className="px-1.5 py-0.5 bg-muted font-mono">↑</kbd></div>
              <div className="flex justify-between"><span>Select 1-5</span><kbd className="px-1.5 py-0.5 bg-muted font-mono">1-5</kbd></div>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-2 font-medium">Chart Period</p>
            <div className="space-y-1">
              <div className="flex justify-between"><span>1 Month</span><kbd className="px-1.5 py-0.5 bg-muted font-mono">M</kbd></div>
              <div className="flex justify-between"><span>Quarter</span><kbd className="px-1.5 py-0.5 bg-muted font-mono">Q</kbd></div>
              <div className="flex justify-between"><span>Year</span><kbd className="px-1.5 py-0.5 bg-muted font-mono">Y</kbd></div>
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-2 font-medium">Actions (with selection)</p>
            <div className="space-y-1">
              <div className="flex justify-between"><span>Expand/Collapse</span><kbd className="px-1.5 py-0.5 bg-muted font-mono">Enter</kbd> / <kbd className="px-1.5 py-0.5 bg-muted font-mono">X</kbd></div>
              <div className="flex justify-between"><span>Report progress</span><kbd className="px-1.5 py-0.5 bg-muted font-mono">R</kbd></div>
              <div className="flex justify-between"><span>View history</span><kbd className="px-1.5 py-0.5 bg-muted font-mono">H</kbd></div>
              <div className="flex justify-between"><span>Edit</span><kbd className="px-1.5 py-0.5 bg-muted font-mono">E</kbd></div>
              <div className="flex justify-between"><span>Delete</span><kbd className="px-1.5 py-0.5 bg-muted font-mono">D</kbd></div>
              <div className="flex justify-between"><span>Open settings</span><kbd className="px-1.5 py-0.5 bg-muted font-mono">O</kbd></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// History Modal - shows all progress updates for an objective
function HistoryModal({ objective, onClose }: { objective: Objective; onClose: () => void }) {
  const isMobile = useIsMobile()

  // Flatten all progress updates with KR info, sorted by newest first
  const sortedUpdates = objective.key_results
    .flatMap(kr =>
      (kr.progress_updates || []).map(u => ({
        ...u,
        krTitle: kr.title,
        unit: kr.unit,
      }))
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  const content = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 select-none flex-shrink-0">
        <span className="font-medium text-sm">Progress History</span>
        {!isMobile && (
          <button onClick={onClose} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground flex-shrink-0">
            <X className="h-3.5 w-3.5" />
            <kbd className="px-1 py-0.5 bg-muted font-mono text-[10px]">Esc</kbd>
          </button>
        )}
      </div>

      {/* History timeline */}
      <ScrollArea className="flex-1 min-h-0">
        {sortedUpdates.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            No progress updates yet
          </div>
        ) : (
          <div className="relative pr-3">
            {/* Timeline line */}
            <div className="absolute left-[5px] top-2 bottom-2 w-px bg-border" />
            <div className="space-y-4">
              {sortedUpdates.map(u => {
                const delta = u.new_value - u.previous_value
                const deltaColor = delta > 0 ? "text-green-500" : delta < 0 ? "text-red-500" : "text-muted-foreground"
                const deltaText = delta > 0 ? `+${delta}` : delta.toString()

                return (
                  <div key={u.id} className="relative pl-6">
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-1 w-[11px] h-[11px] rounded-full border-2 border-border bg-background" />
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(u.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })},{" "}
                          {new Date(u.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                        <span className={`text-xs font-mono ${deltaColor}`}>{deltaText}</span>
                      </div>
                      <p className="text-xs truncate" title={u.krTitle}>{u.krTitle}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {u.previous_value} → {u.new_value} {u.unit}
                      </p>
                      {u.note && (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">"{u.note}"</p>
                      )}
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

  // Mobile: Drawer
  if (isMobile) {
    return (
      <Drawer open onOpenChange={open => !open && onClose()}>
        <DrawerContent className="!mt-0 h-[85dvh] !max-h-[85dvh] flex flex-col rounded-t-lg">
          <DrawerHeader className="pb-2 select-none flex-shrink-0 pt-2">
            <DrawerTitle className="text-sm font-medium sr-only">Progress History</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4 flex-1 min-h-0 flex flex-col">
            {content}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  // Desktop: Centered dialog
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md max-h-[70vh] flex flex-col border border-border bg-background p-5"
        onClick={e => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  )
}

export function Dashboard({ user, org, orgRole, devMode, needsOrgName, userOrgs = [] }: Props) {
  // Zustand store
  const {
    showObjectiveModal, showReportModal, showOrgSettings, showHelp, showHistoryModal,
    editingObjective, reportingObjective, historyObjective,
    selectedIdx, hoveredObjId, expandedIds, menuOpenId,
    objectives: storeObjectives, orgMembers, orgInvites,
    setObjectives, setOrgMembers, setOrgInvites,
    openObjectiveModal, closeObjectiveModal,
    openReportModal, closeReportModal,
    openOrgSettings, closeOrgSettings,
    openHelp, closeHelp,
    openHistoryModal, closeHistoryModal,
    setSelectedIdx, setHoveredObjId, toggleExpanded, setMenuOpenId,
    selectNext, selectPrev, selectByNumber,
    setChartPeriod, cycleTheme,
  } = useAppStore()

  const [devObjectives, setDevObjectives] = useState<Objective[]>([])
  const { data: dbObjectives = [], mutate } = useSWR(devMode ? null : "objectives", fetchData)
  const supabase = createClient()
  const isAdmin = orgRole === "owner" || orgRole === "admin"


  // Sync fetched objectives to store
  useEffect(() => {
    if (!devMode && dbObjectives.length > 0) {
      setObjectives(dbObjectives)
    }
  }, [dbObjectives, devMode, setObjectives])

  const objectives = devMode ? devObjectives : storeObjectives.length > 0 ? storeObjectives : dbObjectives

  // Dev mode: custom mutate function to update local state
  const devMutate = useCallback((newObjectives?: Objective[]) => {
    if (newObjectives) setDevObjectives(newObjectives)
  }, [])

  // Fetch org members and invites when org settings is opened (skip in dev mode)
  useEffect(() => {
    if (showOrgSettings && org && !devMode) {
      Promise.all([
        import("@/lib/actions").then(m => m.getOrgMembers(org.id)),
        import("@/lib/actions").then(m => m.getOrgInvites(org.id))
      ]).then(([members, invites]) => {
        setOrgMembers(members)
        setOrgInvites(invites)
      })
    }
  }, [showOrgSettings, org, devMode, setOrgMembers, setOrgInvites])

  const canAddObjective = objectives.length < MAX_OBJECTIVES

  const deleteObj = useCallback(async (id: string) => {
    if (devMode) {
      setDevObjectives(prev => prev.filter(o => o.id !== id))
      return
    }
    await supabase.from("objectives").delete().eq("id", id)
    mutate()
  }, [devMode, supabase, mutate])

  const onKey = useCallback((e: KeyboardEvent) => {
    // Skip if typing in input/textarea
    const tag = (e.target as HTMLElement)?.tagName
    const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"

    // Global shortcuts (work even in inputs)
    if (e.key === "Escape") {
      e.preventDefault()
      if (showHistoryModal) { closeHistoryModal(); return }
      if (showHelp) { closeHelp(); return }
      if (menuOpenId) { setMenuOpenId(null); return }
      if (showObjectiveModal) { closeObjectiveModal(); return }
      if (showReportModal) { closeReportModal(); return }
      if (showOrgSettings) { closeOrgSettings(); return }
      setSelectedIdx(-1)
      return
    }

    // Cmd shortcuts
    if (e.metaKey || e.ctrlKey) {
      if (e.key === "n") { e.preventDefault(); if (canAddObjective && !showObjectiveModal && !showReportModal) openObjectiveModal() }
      if (e.key === ",") { e.preventDefault(); if (!showOrgSettings) openOrgSettings() }
      if (e.key === ".") { e.preventDefault(); cycleTheme() }
      return
    }

    // Skip rest if in input or modal open
    if (isInput || showObjectiveModal || showReportModal || showOrgSettings || showHelp || showHistoryModal) return

    // Help
    if (e.key === "?" || (e.shiftKey && e.key === "/")) { e.preventDefault(); openHelp(); return }

    // Chart period shortcuts
    if (e.key === "m" || e.key === "M") { e.preventDefault(); setChartPeriod("1M"); return }
    if (e.key === "q" || e.key === "Q") { e.preventDefault(); setChartPeriod("Q"); return }
    if (e.key === "y" || e.key === "Y") { e.preventDefault(); setChartPeriod("Y"); return }

    // Number keys to select objective (1-5)
    if (e.key >= "1" && e.key <= "5") {
      e.preventDefault()
      selectByNumber(parseInt(e.key))
      return
    }

    // J/K navigation
    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault()
      selectNext()
      return
    }
    if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault()
      selectPrev()
      return
    }

    // Actions on selected objective
    if (selectedIdx >= 0 && selectedIdx < objectives.length) {
      const obj = objectives[selectedIdx]

      // Enter/Space/X - toggle expand
      if (e.key === "Enter" || e.key === " " || e.key === "x" || e.key === "X") {
        e.preventDefault()
        toggleExpanded(obj.id)
        return
      }

      // R - report progress
      if (e.key === "r" || e.key === "R") {
        e.preventDefault()
        openReportModal(obj)
        return
      }

      // H - view history
      if (e.key === "h" || e.key === "H") {
        e.preventDefault()
        openHistoryModal(obj)
        return
      }

      // E - edit (admin only)
      if ((e.key === "e" || e.key === "E") && isAdmin) {
        e.preventDefault()
        openObjectiveModal(obj)
        return
      }

      // D/Delete/Backspace - delete (admin only)
      if ((e.key === "d" || e.key === "D" || e.key === "Delete" || e.key === "Backspace") && isAdmin) {
        e.preventDefault()
        if (confirm(`Delete "${obj.title}"?`)) deleteObj(obj.id)
        return
      }
    }

    // O - open settings
    if (e.key === "o" || e.key === "O") {
      e.preventDefault()
      openOrgSettings()
      return
    }

  }, [
    canAddObjective, objectives, selectedIdx, showObjectiveModal, showReportModal,
    showOrgSettings, showHelp, showHistoryModal, menuOpenId, isAdmin, deleteObj,
    closeHelp, closeHistoryModal, setMenuOpenId, closeObjectiveModal, closeReportModal, closeOrgSettings,
    setSelectedIdx, openObjectiveModal, openOrgSettings, cycleTheme, openHelp, openHistoryModal,
    setChartPeriod, selectByNumber, selectNext, selectPrev, toggleExpanded, openReportModal
  ])

  useEffect(() => {
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onKey])

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Desktop header */}
      <header className="hidden md:block border-b border-border flex-shrink-0 select-none">
        <div className="mx-auto flex h-12 max-w-3xl lg:max-w-5xl xl:max-w-6xl items-center justify-between px-6 text-sm">
          <span className="flex items-center gap-2 font-medium"><Target className="h-4 w-4" />OKR</span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <OrgSwitcher
              currentOrg={org}
              orgs={userOrgs}
              onCreateOrg={() => {
                window.location.href = "/?new=1"
              }}
              onEditOrg={() => {
                openOrgSettings()
              }}
            />
            <span>{user.email}</span>
            <button onClick={() => { supabase.auth.signOut(); window.location.reload() }} className="hover:text-foreground">sign out</button>
          </div>
        </div>
      </header>

      {/* Theme button (mobile footer + desktop bottom-right) */}
      <ThemeBtn mobileOrg={org} mobileUserOrgs={userOrgs} mobileOpenOrgSettings={openOrgSettings} mobileSignOut={() => { supabase.auth.signOut(); window.location.reload() }} mobileUserEmail={user.email} />

      <main className="flex-1 flex flex-col overflow-hidden pb-[104px] md:pb-0">
        {/* Charts - fixed */}
        <div className="mx-auto w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl px-6 pt-8 flex-shrink-0">
          <DashboardCharts objectives={objectives} hoveredObj={hoveredObjId} setHoveredObj={setHoveredObjId} />

          {/* Desktop: Objectives header inline */}
          <div className="hidden md:flex items-center justify-between mb-4 select-none">
            <h2 className="text-sm font-medium">Objectives</h2>
            <button
              onClick={() => canAddObjective && openObjectiveModal()}
              disabled={!canAddObjective}
              className={`flex items-center gap-1.5 text-xs ${canAddObjective ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50 cursor-not-allowed"}`}
              title={!canAddObjective ? `Maximum ${MAX_OBJECTIVES} objectives reached` : undefined}
            >
              <Plus className="h-3.5 w-3.5" /> New <kbd className="ml-1 px-1.5 py-0.5 bg-muted font-mono text-[10px]">{"⌘N"}</kbd>
            </button>
          </div>
        </div>

        {/* Objectives - scrollable */}
        <div className="flex-1 overflow-y-auto mx-auto w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl px-6 pb-6">
          {objectives.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No objectives yet</p>
            </div>
          ) : (
            <div>
              {objectives.map((obj, i) => {
                const isHovered = hoveredObjId === obj.id
                const isOtherHovered = hoveredObjId !== null && hoveredObjId !== obj.id
                const isSelected = selectedIdx === i

                return (
                  <div
                    key={obj.id}
                    onMouseEnter={() => setHoveredObjId(obj.id)}
                    onMouseLeave={() => setHoveredObjId(null)}
                    className={`transition-opacity ${isOtherHovered ? "opacity-30" : ""} ${isSelected ? "ring-1 ring-foreground/20" : ""}`}
                  >
                    <div className="group flex items-center gap-3 px-4 py-2">
                      <button onClick={() => toggleExpanded(obj.id)} className="text-muted-foreground hover:text-foreground" title="Expand/Collapse (X)">
                        <ChevronRight className={`h-4 w-4 transition-transform ${expandedIds.has(obj.id) ? "rotate-90" : ""}`} />
                      </button>
                      {(() => {
                        const IconComponent = OKR_ICONS[i % OKR_ICONS.length]
                        return <IconComponent strokeWidth={0} className={`h-2.5 w-2.5 flex-shrink-0 ${CHART_FILL_CLASSES[i % CHART_FILL_CLASSES.length]}`} />
                      })()}
                      <div className="min-w-0 max-w-md"><span className="text-sm block truncate" title={obj.title}>{obj.title}</span></div>
                      <div className="flex-1 flex items-center justify-center">
                        {obj.key_results.length > 0 && (
                          <div className="flex items-center gap-6 text-xs font-mono text-muted-foreground">
                            {obj.key_results.slice(0, 4).map((kr) => (
                              <span key={kr.id} data-tooltip={kr.title} className="hover:text-foreground transition-colors">{kr.current_value}/{kr.target_value}{kr.unit}</span>
                            ))}
                            {obj.key_results.length > 4 && <span data-tooltip={obj.key_results.slice(4).map(kr => kr.title).join(", ")} className="hover:text-foreground transition-colors">+{obj.key_results.length - 4}</span>}
                          </div>
                        )}
                      </div>
                      <span data-tooltip="Overall progress" className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors leading-none">{obj.overall_progress.toFixed(0)}%</span>
                      <button onClick={() => openReportModal(obj)} className="text-xs text-muted-foreground hover:text-foreground transition-colors leading-none flex items-center gap-1">
                        report <kbd className="px-1 py-0.5 bg-muted font-mono text-[10px]">R</kbd>
                      </button>
                      <button onClick={() => openHistoryModal(obj)} className="text-xs text-muted-foreground hover:text-foreground transition-colors leading-none flex items-center gap-1">
                        history <kbd className="px-1 py-0.5 bg-muted font-mono text-[10px]">H</kbd>
                      </button>
                      {isAdmin && (
                        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                          <button
                            onClick={() => setMenuOpenId(menuOpenId === obj.id ? null : obj.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {menuOpenId === obj.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />
                              <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] bg-popover border border-border rounded-md shadow-md py-1">
                                <button
                                  onClick={() => { openObjectiveModal(obj); setMenuOpenId(null) }}
                                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted/50 flex items-center justify-between"
                                >
                                  <span>Edit</span>
                                  <kbd className="text-[10px] text-muted-foreground font-mono">E</kbd>
                                </button>
                                <button
                                  onClick={() => { deleteObj(obj.id); setMenuOpenId(null) }}
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
                    {expandedIds.has(obj.id) && (
                      <div className="px-4 pb-1 pl-11">
                        {obj.description && <p className="text-xs text-muted-foreground mb-1 truncate" title={obj.description}>{obj.description}</p>}
                        <div>
                          {obj.key_results.map(kr => {
                            const p = kr.target_value === 0 ? 0 : kr.current_value <= kr.target_value
                              ? Math.min((kr.current_value / kr.target_value) * 100, 100)
                              : Math.min((kr.target_value / kr.current_value) * 100, 100)
                            return (
                              <div key={kr.id} className="py-0.5 flex items-center gap-2">
                                <div className="w-8 text-[10px] font-mono text-muted-foreground text-right">{p.toFixed(0)}%</div>
                                <div className="w-16 h-1 bg-muted flex-shrink-0"><div className="h-full bg-foreground/40" style={{ width: `${Math.min(p, 100)}%` }} /></div>
                                <span className="flex-1 text-xs truncate">{kr.title}</span>
                                <span className="text-[10px] text-muted-foreground">{kr.current_value}/{kr.target_value} {kr.unit}</span>
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

      {/* Mobile: Objectives header bar fixed at bottom above footer */}
      <div className="md:hidden fixed bottom-16 left-0 right-0 bg-background z-30 flex items-center justify-between px-4 h-10 select-none">
        <h2 className="text-sm font-medium">Objectives</h2>
        <button
          onClick={() => canAddObjective && openObjectiveModal()}
          disabled={!canAddObjective}
          className={`flex items-center gap-1.5 text-xs ${canAddObjective ? "text-muted-foreground hover:text-foreground" : "text-muted-foreground/50 cursor-not-allowed"}`}
        >
          <Plus className="h-3.5 w-3.5" /> New
        </button>
      </div>

      {showObjectiveModal && <ObjectiveModal
        onClose={closeObjectiveModal}
        onDone={() => { closeObjectiveModal(); if (!devMode) mutate() }}
        devMode={devMode}
        editingObjective={editingObjective}
        onDevCreate={(obj) => setDevObjectives(prev => [obj, ...prev])}
        onDevUpdate={(updatedObj) => setDevObjectives(prev => prev.map(o => o.id === updatedObj.id ? updatedObj : o))}
      />}
      {showReportModal && reportingObjective && <ReportModal
        objective={reportingObjective}
        onClose={closeReportModal}
        onDone={() => { closeReportModal(); if (!devMode) mutate() }}
        devMode={devMode}
        onDevUpdate={(updatedObj) => setDevObjectives(prev => prev.map(o => o.id === updatedObj.id ? updatedObj : o))}
      />}
      {showOrgSettings && (
        <OrgSettings
          org={org}
          members={orgMembers}
          invites={orgInvites}
          currentUserRole={orgRole}
          onClose={closeOrgSettings}
          onInvite={async (email, role) => {
            const { inviteToOrg } = await import("@/lib/actions")
            const result = await inviteToOrg(email, role)
            if (!result.error) {
              const { getOrgInvites } = await import("@/lib/actions")
              setOrgInvites(await getOrgInvites(org.id))
            }
            return result
          }}
          onRemoveMember={async (memberId) => {
            const { removeOrgMember } = await import("@/lib/actions")
            const result = await removeOrgMember(memberId)
            if (!result.error) {
              const { getOrgMembers } = await import("@/lib/actions")
              setOrgMembers(await getOrgMembers(org.id))
            }
            return result
          }}
          onUpdateMemberRole={async (memberId, role) => {
            const { updateMemberRole } = await import("@/lib/actions")
            const result = await updateMemberRole(memberId, role)
            if (!result.error) {
              const { getOrgMembers } = await import("@/lib/actions")
              setOrgMembers(await getOrgMembers(org.id))
            }
            return result
          }}
          onUpdateMemberName={async (memberId, name) => {
            const { updateMemberName } = await import("@/lib/actions")
            const result = await updateMemberName(memberId, name)
            if (!result.error) {
              const { getOrgMembers } = await import("@/lib/actions")
              setOrgMembers(await getOrgMembers(org.id))
            }
            return result
          }}
          onTransferOwnership={async (memberId) => {
            const { transferOwnership } = await import("@/lib/actions")
            const result = await transferOwnership(memberId)
            if (!result.error) {
              const { getOrgMembers } = await import("@/lib/actions")
              setOrgMembers(await getOrgMembers(org.id))
            }
            return result
          }}
          onCancelInvite={async (inviteId) => {
            const { cancelInvite } = await import("@/lib/actions")
            const result = await cancelInvite(inviteId)
            if (!result.error) {
              const { getOrgInvites } = await import("@/lib/actions")
              setOrgInvites(await getOrgInvites(org.id))
            }
            return result
          }}
          onUpdateSettings={async (settings) => {
            const { updateOrgSettings } = await import("@/lib/actions")
            return updateOrgSettings(org.id, settings)
          }}
          highlightOrgName={needsOrgName}
        />
      )}
      {showHelp && <HelpModal onClose={closeHelp} />}
      {showHistoryModal && historyObjective && <HistoryModal objective={historyObjective} onClose={closeHistoryModal} />}
    </div>
  )
}
