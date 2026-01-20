"use client"

import React from "react"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import type { Objective, KeyResult, ObjectiveWithProgress, Organization, OrgMember, OrgInvite } from "@/lib/types"
import useSWR from "swr"
import { Sun, Moon, Monitor, Target, ChevronRight, Plus, Trash2, Sparkles, Loader2, X, Users, Building2, MoreVertical, Circle, Square, Triangle, Diamond, Hexagon } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/lib/components/ui/drawer"
import { useIsMobile } from "@/lib/hooks/use-mobile"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/lib/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { OrgSettings } from "@/lib/components/org-settings"
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

interface Props {
  user: User
  org: Organization
  orgRole: "owner" | "admin" | "member"
  devMode?: boolean
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
  const p = krs.length ? krs.reduce((a, k) => a + Math.min((k.current_value / k.target_value) * 100, 100), 0) / krs.length : 0
  return { ...obj, key_results: krsWithSortedUpdates, overall_progress: Math.min(p, 100) } as ObjectiveWithProgress
  })
}

// Theme button component
function ThemeBtn({ user, supabase, org, onOrgClick }: { user: User; supabase: ReturnType<typeof createClient>; org: Organization; onOrgClick: () => void }) {
  const [t, setT] = useState<"light" | "dark" | "system">("system")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const s = localStorage.getItem("theme") as "light" | "dark" | "system" | null
    if (s) setT(s)
  }, [])

  const select = (v: "light" | "dark" | "system") => {
    setT(v)
    localStorage.setItem("theme", v)
    if (v === "system") {
      document.documentElement.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches)
    } else {
      document.documentElement.classList.toggle("dark", v === "dark")
    }
    setOpen(false)
  }

  const Icon = t === "light" ? Sun : t === "dark" ? Moon : Monitor
  return (
    <>
      {/* Mobile footer */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t border-border bg-background z-40 flex items-center justify-between px-6 h-14 select-none">
        <span className="flex items-center gap-2 text-sm font-medium"><Target className="h-4 w-4" />OKR</span>
        <div className="flex items-center gap-4">
          <button onClick={onOrgClick} className="p-2 text-muted-foreground hover:text-foreground" title={org.name}>
            <Users className="h-4 w-4" />
          </button>
          <div className="relative">
            <button onClick={() => setOpen(!open)} className="p-2 text-muted-foreground hover:text-foreground"><Icon className="h-4 w-4" /></button>
            {open && (
              <div className="absolute bottom-full right-0 mb-2 border border-border bg-background p-1 flex flex-col min-w-[100px]">
                {(["light", "dark", "system"] as const).map(v => (
                  <button key={v} onClick={() => select(v)} className={`px-3 py-1.5 text-xs text-left hover:bg-muted ${t === v ? "text-foreground" : "text-muted-foreground"}`}>{v}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => { supabase.auth.signOut(); window.location.reload() }} className="text-xs text-muted-foreground hover:text-foreground">sign out</button>
        </div>
      </nav>
      {/* Desktop theme button */}
      <div className="hidden md:block fixed bottom-4 right-4 z-40 select-none">
        <div className="relative">
          <button onClick={() => setOpen(!open)} className="p-2 border border-border bg-background text-muted-foreground hover:text-foreground"><Icon className="h-4 w-4" /></button>
          {open && (
            <div className="absolute bottom-full right-0 mb-2 border border-border bg-background p-1 flex flex-col min-w-[100px]">
              {(["light", "dark", "system"] as const).map(v => (
                <button key={v} onClick={() => select(v)} className={`px-3 py-1.5 text-xs text-left hover:bg-muted ${t === v ? "text-foreground" : "text-muted-foreground"}`}>{v}</button>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Dashboard charts component with burndown
function DashboardCharts({ objectives, hoveredObj, setHoveredObj }: { 
  objectives: ObjectiveWithProgress[]; 
  hoveredObj: string | null;
  setHoveredObj: (id: string | null) => void;
}) {
  // Generate burndown data for each objective
  const generateBurndownData = () => {
    if (objectives.length === 0) return []
    
    // Find date range across all objectives
    const now = new Date()
    const allDates = objectives.flatMap(obj => {
      const created = new Date(obj.created_at)
      const end = obj.end_date ? new Date(obj.end_date) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      return [created, end]
    })
    
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())))
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime()), now.getTime()))
    
    // Generate timeline points (weekly intervals + objective start dates + today)
    const pointsSet = new Set<number>()

    // Add weekly intervals
    const current = new Date(minDate)
    current.setHours(0, 0, 0, 0)
    while (current <= maxDate) {
      pointsSet.add(current.getTime())
      current.setDate(current.getDate() + 7)
    }

    // Add each objective's creation date (normalized to start of day)
    objectives.forEach(obj => {
      const created = new Date(obj.created_at)
      created.setHours(0, 0, 0, 0)
      pointsSet.add(created.getTime())
    })

    // Add today (normalized to start of day)
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)
    pointsSet.add(today.getTime())

    // Sort and convert back to dates
    const points = Array.from(pointsSet).sort((a, b) => a - b).map(ts => new Date(ts))
    
    // Build data for each point
    return points.map(date => {
      const entry: Record<string, number | string | number> = {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        _timestamp: date.getTime()
      }
      
      objectives.forEach((obj, idx) => {
        const objCreated = new Date(obj.created_at)
        const objEnd = obj.end_date ? new Date(obj.end_date) : maxDate

        // Compare dates only (ignore time of day)
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        const objCreatedOnly = new Date(objCreated.getFullYear(), objCreated.getMonth(), objCreated.getDate())

        if (dateOnly < objCreatedOnly) {
          // Before objective started - don't show line
          entry[`obj${idx}`] = null as any
        } else if (dateOnly.getTime() === objCreatedOnly.getTime()) {
          // At start date - begin at 0%
          entry[`obj${idx}`] = 0
        } else if (date >= objEnd || date >= now) {
          // After end date or at/after today - show actual progress
          entry[`obj${idx}`] = Math.min(obj.overall_progress, 100)
        } else {
          // During objective timeline - calculate progress at this point
          let progressAtDate = 0
          obj.key_results.forEach(kr => {
            const updates = (kr as any).progress_updates || []
            const relevantUpdates = updates.filter((u: any) => new Date(u.created_at) <= date)
            if (relevantUpdates.length > 0) {
              const latestUpdate = relevantUpdates.sort((a: any, b: any) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )[0]
              progressAtDate += (latestUpdate.new_value / kr.target_value) * 100
            }
          })
          entry[`obj${idx}`] = obj.key_results.length > 0 ? Math.min(progressAtDate / obj.key_results.length, 100) : 0
        }
      })
      
      return entry
    })
  }

  const burndownData = generateBurndownData()
  
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

  // Find current position index in data (closest to today)
  const nowTs = Date.now()
  const currentIdx = burndownData.findIndex((d, i) => {
    if (i === burndownData.length - 1) return true
    const nextTs = (burndownData[i + 1] as any)?._timestamp || nowTs
    return nextTs > nowTs
  })

  return (
    <div className="mb-8">
      {/* Status chart */}
      {objectives.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium">Status</span>
          </div>
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <LineChart data={burndownData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
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
                content={<ChartTooltipContent hideLabel />}
              />
              {objectives.map((obj, idx) => {
                const isHovered = hoveredObj === obj.id
                const isOtherHovered = hoveredObj !== null && hoveredObj !== obj.id
                const IconComponent = OKR_ICONS[idx % OKR_ICONS.length]
                const color = colors[idx % colors.length]
                // Find first non-null data point index for this objective
                const startIdx = burndownData.findIndex(d => (d as any)[`obj${idx}`] !== null && (d as any)[`obj${idx}`] !== undefined)
                return (
                  <Line
                    key={obj.id}
                    type="monotone"
                    dataKey={`obj${idx}`}
                    stroke={color}
                    strokeWidth={isHovered ? 3 : 2}
                    strokeOpacity={isOtherHovered ? 0.2 : 1}
                    connectNulls={false}
                    dot={(props: any) => {
                      const opacity = isOtherHovered ? 0.2 : 1
                      const size = 8
                      // Show icon at start point
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
                      // Show dot at current position
                      if (props.index === currentIdx && props.cx && props.cy) {
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
                    activeDot={{ r: 4, fill: color, stroke: color }}
                    name={obj.title.length > 20 ? obj.title.slice(0, 20) + "..." : obj.title}
                    onMouseEnter={() => setHoveredObj(obj.id)}
                    onMouseLeave={() => setHoveredObj(null)}
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
    try {
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
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Increase revenue by 50%" required autoFocus className="w-full h-10 border border-border bg-transparent px-3 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground mb-1.5 block">Why is this important?</label>
        <textarea 
          value={description} 
          onChange={e => {
            setDescription(e.target.value)
            e.target.style.height = "auto"
            e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
          }} 
          placeholder="Provide context: why this matters, what success looks like..." 
          rows={2} 
          required 
          minLength={10} 
          className="w-full border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none resize-none overflow-hidden" 
        />
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
      <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
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
          <button type="button" onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
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
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(objective.key_results.map(kr => [kr.id, kr.current_value]))
  )
  const [note, setNote] = useState("")

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    
    if (devMode && onDevUpdate) {
      // Dev mode: update local state
      const updatedObj: Objective = {
        ...objective,
        key_results: objective.key_results.map(kr => ({
          ...kr,
          current_value: values[kr.id] ?? kr.current_value,
        })),
        overall_progress: Math.min(objective.key_results.reduce((acc, kr) => {
          const newVal = values[kr.id] ?? kr.current_value
          return acc + Math.min((newVal / kr.target_value) * 100, 100)
        }, 0) / objective.key_results.length, 100),
      }
      onDevUpdate(updatedObj)
      onDone()
      return
    }
    
    const { updateKeyResultProgress } = await import("@/lib/actions")
    for (const kr of objective.key_results) {
      const newValue = values[kr.id]
      if (newValue !== kr.current_value) {
        await updateKeyResultProgress(kr.id, newValue, note || undefined)
      }
    }
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md border border-border bg-background p-6 mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 select-none">
          <span className="font-medium text-sm">Report Progress</span>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <p className="text-sm mb-4">{objective.title}</p>
        <form onSubmit={submit} className="space-y-4">
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
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-foreground text-background text-sm disabled:opacity-50 rounded-md">{loading ? "Saving..." : "Save"}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function Dashboard({ user, org, orgRole, devMode }: Props) {
  const [modal, setModal] = useState(false)
  const [reportObj, setReportObj] = useState<Objective | null>(null)
  const [editObj, setEditObj] = useState<Objective | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [hoveredObj, setHoveredObj] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [orgSettingsOpen, setOrgSettingsOpen] = useState(false)
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([])
  const [orgInvites, setOrgInvites] = useState<OrgInvite[]>([])
  const [devObjectives, setDevObjectives] = useState<Objective[]>([])
  const { data: dbObjectives = [], mutate } = useSWR(devMode ? null : "objectives", fetchData)
  const objectives = devMode ? devObjectives : dbObjectives
  const supabase = createClient()
  const isAdmin = orgRole === "owner" || orgRole === "admin"
  
  // Dev mode: custom mutate function to update local state
  const devMutate = useCallback((newObjectives?: Objective[]) => {
    if (newObjectives) setDevObjectives(newObjectives)
  }, [])

  // Fetch org members and invites when org settings is opened (skip in dev mode)
  useEffect(() => {
    if (orgSettingsOpen && org && !devMode) {
      Promise.all([
        import("@/lib/actions").then(m => m.getOrgMembers(org.id)),
        import("@/lib/actions").then(m => m.getOrgInvites(org.id))
      ]).then(([members, invites]) => {
        setOrgMembers(members)
        setOrgInvites(invites)
      })
    }
  }, [orgSettingsOpen, org, devMode])

  const canAddObjective = objectives.length < MAX_OBJECTIVES

  const onKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "n") { e.preventDefault(); if (canAddObjective) setModal(true) }
    if (e.key === "Escape") { setModal(false); setReportObj(null); setEditObj(null); setMenuOpen(null); setOrgSettingsOpen(false) }
  }, [canAddObjective])

  useEffect(() => {
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onKey])

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const deleteObj = async (id: string) => {
    if (devMode) {
      setDevObjectives(prev => prev.filter(o => o.id !== id))
      return
    }
    await supabase.from("objectives").delete().eq("id", id)
    mutate()
  }

  const active = objectives.filter(o => o.status === "active").length
  const completed = objectives.filter(o => o.overall_progress >= 100).length
  const avg = objectives.length ? objectives.reduce((a, o) => a + o.overall_progress, 0) / objectives.length : 0

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Desktop header */}
      <header className="hidden md:block border-b border-border flex-shrink-0 select-none">
        <div className="mx-auto flex h-12 max-w-3xl lg:max-w-5xl xl:max-w-6xl items-center justify-between px-6 text-sm">
          <span className="flex items-center gap-2 font-medium"><Target className="h-4 w-4" />OKR</span>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <button onClick={() => setOrgSettingsOpen(true)} className="flex items-center gap-1.5 hover:text-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {org.name}
            </button>
            <span>{user.email}</span>
            <button onClick={() => { supabase.auth.signOut(); window.location.reload() }} className="hover:text-foreground">sign out</button>
          </div>
        </div>
      </header>

      {/* Theme button (mobile footer + desktop bottom-right) */}
      <ThemeBtn user={user} supabase={supabase} org={org} onOrgClick={() => setOrgSettingsOpen(true)} />

      <main className="flex-1 flex flex-col overflow-hidden pb-14 md:pb-0">
        {/* Charts - fixed */}
        <div className="mx-auto w-full max-w-3xl lg:max-w-5xl xl:max-w-6xl px-6 pt-8 flex-shrink-0">
          <DashboardCharts objectives={objectives} hoveredObj={hoveredObj} setHoveredObj={setHoveredObj} />

          <div className="flex items-center justify-between mb-4 select-none">
            <h2 className="text-sm font-medium">Objectives</h2>
            <button
              onClick={() => canAddObjective && setModal(true)}
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
                const krs = obj.key_results || []
                const events: { time: number; krId: string; value: number; target: number }[] = []
                krs.forEach(kr => {
                  const updates = (kr as any).progress_updates || []
                  events.push({ time: new Date(obj.created_at).getTime(), krId: kr.id, value: 0, target: kr.target_value })
                  updates.forEach((u: any) => {
                    events.push({ time: new Date(u.created_at).getTime(), krId: kr.id, value: u.new_value, target: kr.target_value })
                  })
                })
                events.sort((a, b) => a.time - b.time)
                const krState: Record<string, { value: number; target: number }> = {}
                const sparkData: { x: number; remaining: number }[] = []
                events.forEach((e, idx) => {
                  krState[e.krId] = { value: e.value, target: e.target }
                  const totalProgress = Object.values(krState).reduce((sum, kr) => sum + (kr.value / kr.target) * 100, 0)
                  const avgProgress = Object.keys(krState).length ? totalProgress / Object.keys(krState).length : 0
                  sparkData.push({ x: idx, remaining: 100 - avgProgress })
                })
                if (sparkData.length < 2) {
                  // For new objectives or ones with no updates, show current state
                  const remaining = Math.max(0, 100 - obj.overall_progress)
                  sparkData.length = 0
                  sparkData.push({ x: 0, remaining: 100 }, { x: 1, remaining })
                }

                const isHovered = hoveredObj === obj.id
                const isOtherHovered = hoveredObj !== null && hoveredObj !== obj.id
                
                return (
                  <div 
                    key={obj.id}
                    onMouseEnter={() => setHoveredObj(obj.id)}
                    onMouseLeave={() => setHoveredObj(null)}
                    className={`transition-opacity ${isOtherHovered ? "opacity-30" : ""}`}
                  >
                    <div className="group flex items-center gap-3 px-4 py-3">
                      <button onClick={() => toggle(obj.id)} className="text-muted-foreground hover:text-foreground">
                        <ChevronRight className={`h-4 w-4 transition-transform ${expanded.has(obj.id) ? "rotate-90" : ""}`} />
                      </button>
                      {(() => {
                        const IconComponent = OKR_ICONS[i % OKR_ICONS.length]
                        return <IconComponent strokeWidth={0} className={`h-2.5 w-2.5 flex-shrink-0 ${CHART_FILL_CLASSES[i % CHART_FILL_CLASSES.length]}`} />
                      })()}
                      <div className="flex-1 min-w-0"><span className="text-sm">{obj.title}</span></div>
                      <div className="w-10 text-xs font-mono text-muted-foreground text-right">{obj.overall_progress.toFixed(0)}%</div>
                      <div className="w-16 h-6 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={sparkData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
                            <YAxis domain={[0, 100]} hide />
                            <Line type="monotone" dataKey="remaining" stroke="currentColor" strokeWidth={1.5} dot={false} className="text-foreground/50" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      <button onClick={() => setReportObj(obj)} className="text-xs text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        report
                      </button>
                      {isAdmin && (
                        <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => setMenuOpen(menuOpen === obj.id ? null : obj.id)} 
                            className="p-1 text-muted-foreground hover:text-foreground"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                          {menuOpen === obj.id && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
                              <div className="absolute right-0 top-full mt-1 z-50 min-w-[120px] bg-popover border border-border rounded-md shadow-md py-1">
                                <button 
                                  onClick={() => { setEditObj(obj); setMenuOpen(null) }} 
                                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted/50"
                                >
                                  Edit
                                </button>
                                <button 
                                  onClick={() => { deleteObj(obj.id); setMenuOpen(null) }} 
                                  className="w-full px-3 py-1.5 text-left text-sm text-red-400 hover:bg-muted/50"
                                >
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {expanded.has(obj.id) && (
                      <div className="px-4 pb-2 pl-11">
                        {obj.description && <p className="text-xs text-muted-foreground mb-2">{obj.description}</p>}
                        <div>
                          {obj.key_results.map(kr => {
                            const p = Math.min((kr.current_value / kr.target_value) * 100, 100)
                            return (
                              <div key={kr.id} className="py-1 flex items-center gap-2">
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

      {modal && <ObjectiveModal 
        onClose={() => setModal(false)} 
        onDone={() => { setModal(false); if (!devMode) mutate() }}
        devMode={devMode}
        onDevCreate={(obj) => setDevObjectives(prev => [obj, ...prev])}
      />}
      {reportObj && <ReportModal 
        objective={reportObj} 
        onClose={() => setReportObj(null)} 
        onDone={() => { setReportObj(null); if (!devMode) mutate() }}
        devMode={devMode}
        onDevUpdate={(updatedObj) => setDevObjectives(prev => prev.map(o => o.id === updatedObj.id ? updatedObj : o))}
      />}
      {editObj && <ObjectiveModal 
        onClose={() => setEditObj(null)} 
        onDone={() => { setEditObj(null); if (!devMode) mutate() }}
        devMode={devMode}
        editingObjective={editObj}
        onDevUpdate={(updatedObj) => setDevObjectives(prev => prev.map(o => o.id === updatedObj.id ? updatedObj : o))}
      />}
      {orgSettingsOpen && (
        <OrgSettings
          org={org}
          members={orgMembers}
          invites={orgInvites}
          currentUserRole={orgRole}
          onClose={() => setOrgSettingsOpen(false)}
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
            return updateOrgSettings(settings)
          }}
        />
      )}
    </div>
  )
}
