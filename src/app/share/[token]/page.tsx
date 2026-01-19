import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Objective, KeyResult } from "@/lib/types"

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: obj } = await supabase
    .from("objectives")
    .select(`*, key_results (*)`)
    .eq("share_token", token)
    .eq("is_public", true)
    .single()

  if (!obj) notFound()

  const krs = (obj as Objective & { key_results: KeyResult[] }).key_results || []
  const progress = krs.length ? krs.reduce((a, k) => a + (k.current_value / k.target_value) * 100, 0) / krs.length : 0
  const days = Math.ceil((new Date(obj.end_date).getTime() - Date.now()) / 86400000)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-4 text-sm">
          <span className="font-medium">OKR</span>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">create your own</Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6">
        <div className="border border-border">
          <div className="flex items-center px-4 py-3">
            <span className="w-12 text-xs text-right font-mono">{progress.toFixed(0)}%</span>
            <span className="flex-1 ml-4 text-sm">{obj.title}</span>
            <span className="text-xs text-muted-foreground">{obj.status}</span>
          </div>
          {(obj.description || krs.length > 0) && (
            <div className="border-t border-border px-4 py-3 space-y-2">
              {obj.description && <p className="text-xs text-muted-foreground">{obj.description}</p>}
              {krs.map(kr => {
                const p = (kr.current_value / kr.target_value) * 100
                return (
                  <div key={kr.id} className="flex items-center gap-3 text-xs">
                    <span className="w-12 text-right text-muted-foreground font-mono">{p.toFixed(0)}%</span>
                    <div className="flex-1 h-1 bg-muted"><div className="h-full bg-foreground/30" style={{ width: `${Math.min(p, 100)}%` }} /></div>
                    <span className="text-muted-foreground truncate flex-1">{kr.title}</span>
                    <span className="text-muted-foreground">{kr.current_value}/{kr.target_value}</span>
                  </div>
                )
              })}
              <p className="text-xs text-muted-foreground pt-2">{days > 0 ? `${days}d left` : "overdue"}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
