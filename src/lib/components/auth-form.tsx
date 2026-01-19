"use client"

import { useState, useEffect } from "react"
import { LoginForm } from "@/lib/components/login-form"
import { DottedGlowBackground } from "@/lib/components/ui/dotted-glow-background"
import { Sun, Moon, Monitor, Target } from "lucide-react"

export function AuthForm() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 px-4 pt-4 pb-6 md:px-6 md:pt-6 md:pb-10">
        <div className="flex gap-2">
          <a href="#" className="flex items-center gap-2 font-medium">
            <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
              <Target className="size-4" />
            </div>
            OKRs
          </a>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="bg-black relative hidden lg:block overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            maskImage: "radial-gradient(ellipse at center, black 0%, black 30%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, black 30%, transparent 70%)"
          }}
        >
          <DottedGlowBackground
            gap={16}
            radius={0.8}
            opacity={0.7}
            speedMin={0.2}
            speedMax={0.6}
            speedScale={0.7}
            color="rgba(255,255,255,0.4)"
            darkColor="rgba(255,255,255,0.4)"
            glowColor="rgba(255,255,255,0.9)"
            darkGlowColor="rgba(255,255,255,0.9)"
          />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-10 z-10">
          <div className="max-w-md text-center">
            <h2 className="text-3xl font-bold tracking-tight mb-4 text-white">
              Startup goals for your team
            </h2>
            <p className="text-zinc-400">
              Set objectives, track key results, and align your team around what matters most.
            </p>
          </div>
        </div>
      </div>
      <ThemeBtn />
    </div>
  )
}

function ThemeBtn() {
  const [t, setT] = useState<"light"|"dark"|"system">("system")
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const s = localStorage.getItem("theme") as "light"|"dark"|"system" | null
    if (s) { setT(s); apply(s) }
  }, [])
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest("[data-theme-menu]")) setOpen(false) }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [open])
  function apply(v: "light"|"dark"|"system") {
    document.documentElement.classList.toggle("dark", v === "dark" || (v === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches))
  }
  function select(v: "light"|"dark"|"system") {
    setT(v); localStorage.setItem("theme", v); apply(v); setOpen(false)
  }
  const Icon = t === "light" ? Sun : t === "dark" ? Moon : Monitor
  return (
    <div className="fixed bottom-4 right-4" data-theme-menu>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label="Theme"
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute bottom-8 right-0 border border-border bg-background py-1 min-w-[90px]">
          {(["light", "dark", "system"] as const).map(v => (
            <button
              key={v}
              onClick={() => select(v)}
              className={`flex w-full items-center gap-2 px-3 py-1 text-[11px] hover:bg-muted ${t === v ? "text-foreground" : "text-muted-foreground"}`}
            >
              {v === "light" && <Sun className="h-3 w-3" />}
              {v === "dark" && <Moon className="h-3 w-3" />}
              {v === "system" && <Monitor className="h-3 w-3" />}
              {v}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
