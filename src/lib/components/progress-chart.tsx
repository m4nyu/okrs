"use client"

import { Circle, Diamond, Hexagon, Square, Triangle } from "lucide-react"
import React from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip } from "@/lib/components/ui/chart"
import { $, useStore } from "@/lib/store"
import type { ObjectiveWithProgress } from "@/lib/types"

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
const CHART_FILL_CLASSES = ["fill-chart-1", "fill-chart-2", "fill-chart-3", "fill-chart-4", "fill-chart-5"]
const OKR_ICONS = [Circle, Square, Diamond, Triangle, Hexagon] as const

interface ProgressChartProps {
  objectives: ObjectiveWithProgress[]
  hoveredObj: string | null
  setHoveredObj: (id: string | null) => void
}

export default function ProgressChart({ objectives, hoveredObj, setHoveredObj }: ProgressChartProps) {
  const range = useStore((s) => s.range)

  const getPeriodBounds = () => {
    const now = new Date()
    const todayOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    let earliestDate: Date = new Date(todayOnly)
    objectives.forEach((obj) => {
      const created = new Date(obj.created_at)
      created.setHours(0, 0, 0, 0)
      if (created < earliestDate) earliestDate = created
    })
    let periodEnd: Date
    switch (range) {
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
    const endDate = periodEnd > todayOnly ? periodEnd : todayOnly
    return { startDate: earliestDate, endDate, todayOnly }
  }

  const generateProgressData = () => {
    if (objectives.length === 0) return []
    const { startDate, endDate, todayOnly } = getPeriodBounds()
    const points: Date[] = []
    const current = new Date(startDate)
    while (current <= endDate) {
      points.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    if (points[points.length - 1]?.getTime() !== endDate.getTime()) {
      points.push(new Date(endDate))
    }
    objectives.forEach((obj) => {
      const created = new Date(obj.created_at)
      created.setHours(0, 0, 0, 0)
      if (created >= startDate && created <= endDate) {
        const exists = points.some((p) => Math.abs(p.getTime() - created.getTime()) < 86400000)
        if (!exists) points.push(created)
      }
      obj.key_results.forEach((kr) => {
        const updates = (kr as any).progress_updates || []
        updates.forEach((u: any) => {
          const updateDate = new Date(u.created_at)
          updateDate.setHours(0, 0, 0, 0)
          if (updateDate >= startDate && updateDate <= endDate) {
            const exists = points.some((p) => Math.abs(p.getTime() - updateDate.getTime()) < 86400000)
            if (!exists) points.push(updateDate)
          }
        })
      })
    })
    points.sort((a, b) => a.getTime() - b.getTime())

    const calculateProgressAtDate = (obj: ObjectiveWithProgress, targetDate: Date): number => {
      const krProgresses: number[] = []
      obj.key_results.forEach((kr) => {
        const updates = (kr as any).progress_updates || []
        const relevantUpdates = updates.filter((u: any) => {
          const uDate = new Date(u.created_at)
          uDate.setHours(0, 0, 0, 0)
          return uDate <= targetDate
        })
        if (relevantUpdates.length > 0) {
          const latestUpdate = relevantUpdates.sort(
            (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
      return krProgresses.length % 2 !== 0 ? krProgresses[mid] : (krProgresses[mid - 1] + krProgresses[mid]) / 2
    }

    return points.map((date) => {
      const entry: Record<string, number | string | null> = {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        _timestamp: date.getTime(),
      }
      objectives.forEach((obj, idx) => {
        const objCreated = new Date(obj.created_at)
        objCreated.setHours(0, 0, 0, 0)
        const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        if (dateOnly > todayOnly) {
          entry[`obj${idx}`] = null
        } else if (dateOnly < objCreated) {
          entry[`obj${idx}`] = null
        } else if (dateOnly.getTime() === objCreated.getTime()) {
          entry[`obj${idx}`] = 0
        } else if (objCreated < startDate && dateOnly.getTime() === startDate.getTime()) {
          entry[`obj${idx}`] = calculateProgressAtDate(obj, startDate)
        } else {
          entry[`obj${idx}`] = calculateProgressAtDate(obj, dateOnly)
        }
      })
      return entry
    })
  }

  const progressData = React.useMemo(() => generateProgressData(), [range, objectives])

  const chartConfig: Record<string, { label: string; color?: string }> = { date: { label: "Date" } }
  objectives.forEach((obj, idx) => {
    chartConfig[`obj${idx}`] = {
      label: obj.title.length > 20 ? `${obj.title.slice(0, 20)}...` : obj.title,
      color: CHART_COLORS[idx % CHART_COLORS.length],
    }
  })

  if (objectives.length === 0) return null

  return (
    <div className="mb-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium">Status</span>
          <div className="flex items-center gap-0.5 text-xs">
            {(["1M", "Q", "Y"] as const).map((p) => (
              <button
                key={p}
                onClick={() => $.set("range", p)}
                className={`px-1.5 py-0.5 transition-colors flex items-center gap-1 ${range === p ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
              >
                {p}
                <kbd className={`px-1 py-0.5 font-mono text-[10px] ${range === p ? "bg-background/20" : "bg-muted"}`}>
                  {p === "1M" ? "M" : p}
                </kbd>
              </button>
            ))}
          </div>
        </div>
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <LineChart
            data={progressData}
            margin={{ top: 10, right: 40, left: 0, bottom: 0 }}
            style={{ transition: "none" }}
          >
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
                const obj = objectives.find((o) => o.id === hoveredObj)
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
                          <div key={kr.id}>
                            {kr.current_value}/{kr.target_value}
                            {kr.unit}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }}
            />
            {objectives.map((obj, idx) => {
              const isOtherHovered = hoveredObj !== null && hoveredObj !== obj.id
              const IconComponent = OKR_ICONS[idx % OKR_ICONS.length]
              const color = CHART_COLORS[idx % CHART_COLORS.length]
              const startIdx = progressData.findIndex(
                (d) => (d as any)[`obj${idx}`] !== null && (d as any)[`obj${idx}`] !== undefined
              )
              const endIdx = progressData.reduce((last, d, i) => ((d as any)[`obj${idx}`] !== null ? i : last), -1)
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
                          <IconComponent
                            strokeWidth={0}
                            className={`w-2 h-2 ${CHART_FILL_CLASSES[idx % CHART_FILL_CLASSES.length]}`}
                          />
                        </foreignObject>
                      )
                    }
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
                  name={obj.title.length > 20 ? `${obj.title.slice(0, 20)}...` : obj.title}
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
    </div>
  )
}

// Export constants for use in objectives.tsx
export { CHART_COLORS, CHART_FILL_CLASSES, OKR_ICONS }
