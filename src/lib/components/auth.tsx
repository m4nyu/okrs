"use client"

import { Check, Loader2, Monitor, Moon, Sun, Target, X } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/lib/components/ui/button"
import { DottedGlowBackground } from "@/lib/components/ui/dotted-glow-background"
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/lib/components/ui/field"
import { Input } from "@/lib/components/ui/input"
import { createClient } from "@/lib/db/client"
import { cn } from "@/lib/utils"

export function AuthForm({ redirectTo }: { redirectTo?: string }) {
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
            <LoginForm redirectTo={redirectTo} />
          </div>
        </div>
      </div>
      <div className="bg-background relative hidden lg:block overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            maskImage: "radial-gradient(ellipse at center, black 0%, black 20%, transparent 60%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 0%, black 20%, transparent 60%)",
          }}
        >
          <DottedGlowBackground
            gap={16}
            radius={1.2}
            opacity={0.7}
            speedMin={0.2}
            speedMax={0.6}
            speedScale={0.7}
            colorLightVar="--foreground"
            colorDarkVar="--foreground"
            glowColorLightVar="--foreground"
            glowColorDarkVar="--foreground"
          />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-10 z-10">
          <div className="max-w-md text-center select-none">
            <h2 className="text-3xl font-bold tracking-tight mb-4 text-foreground">Startup goals for your team</h2>
            <p className="text-muted-foreground">
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
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-theme-menu]")) setOpen(false)
    }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [open])

  const Icon = !mounted ? Monitor : theme === "light" ? Sun : theme === "dark" ? Moon : Monitor
  return (
    <div className="fixed bottom-4 right-4 z-50" data-theme-menu>
      <button
        onClick={() => setOpen(!open)}
        className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label="Theme"
      >
        <Icon className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute bottom-8 right-0 border border-border bg-background py-1 min-w-[90px]">
          {(["light", "dark", "system"] as const).map((v) => (
            <button
              key={v}
              onClick={() => { setTheme(v); setOpen(false) }}
              className={`flex w-full items-center gap-2 px-3 py-1 text-[11px] hover:bg-muted ${theme === v ? "text-foreground" : "text-muted-foreground"}`}
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

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function LoginForm({
  className,
  redirectTo,
  ...props
}: React.ComponentProps<"form"> & { redirectTo?: string }) {
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [emailTouched, setEmailTouched] = useState(false)
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const emailValid = isValidEmail(email)
  const showEmailError = emailTouched && email && !emailValid

  // Check for OAuth callback errors in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlError = params.get("error")
    if (urlError) {
      setError(decodeURIComponent(urlError))
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (step === "otp") {
      inputRefs.current[0]?.focus()
    }
  }, [step])

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError("")
    console.log("[Auth] Sending OTP to:", email)
    const res = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    console.log("[Auth] OTP response:", data)
    if (data.error) {
      setError(data.error)
    } else {
      setStep("otp")
    }
    setLoading(false)
  }

  async function verifyOtp(code: string) {
    setLoading(true)
    setError("")
    const res = await fetch("/api/auth/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    })
    const data = await res.json()
    if (data.error) {
      setError(data.error)
      setOtp(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
      setLoading(false)
    } else if (data.verified) {
      window.location.href = redirectTo || "/"
    }
  }

  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return
    const newOtp = [...otp]
    newOtp[index] = value.slice(-1)
    setOtp(newOtp)
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
    if (newOtp.every((d) => d) && newOtp.join("").length === 6) {
      verifyOtp(newOtp.join(""))
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (paste.length === 6) {
      const newOtp = paste.split("")
      setOtp(newOtp)
      verifyOtp(paste)
    }
  }

  async function handleOAuthSignIn(provider: "google" | "github" | "slack" | "discord") {
    setLoading(true)
    setError("")
    const supabase = createClient()
    const callbackUrl = `${window.location.origin}/api/auth/callback${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ""}`
    console.log(`[Auth] Starting ${provider} OAuth, callbackUrl:`, callbackUrl)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl,
        queryParams: { prompt: provider === "github" ? "consent" : "select_account" },
      },
    })
    if (error) {
      console.error(`[Auth] ${provider} OAuth error:`, error)
      setError(error.message)
    } else {
      console.log(`[Auth] ${provider} OAuth initiated:`, data)
    }
    setLoading(false)
  }

  if (step === "otp") {
    return (
      <form className={cn("flex flex-col gap-6", className)} {...props}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="text-muted-foreground text-sm text-balance">We sent a code to {email}</p>
          </div>
          <Field>
            <FieldLabel className="sr-only">Verification code</FieldLabel>
            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <Input
                  key={i}
                  ref={(el) => {
                    inputRefs.current[i] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  disabled={loading}
                  className="h-12 w-10 text-center text-lg"
                />
              ))}
            </div>
          </Field>
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Field>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setStep("email")
                setOtp(["", "", "", "", "", ""])
                setError("")
              }}
              disabled={loading}
            >
              Use a different email
            </Button>
          </Field>
        </FieldGroup>
      </form>
    )
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleEmailSubmit} {...props}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              disabled={loading}
              required
              aria-invalid={showEmailError || undefined}
              className="pr-10"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {email && !emailValid && !showEmailError && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {email && emailValid && <Check className="h-4 w-4 text-emerald-500" />}
              {showEmailError && <X className="h-4 w-4 text-destructive" />}
            </div>
          </div>
          {showEmailError && <p className="text-xs text-destructive mt-1">Please enter a valid email address</p>}
        </Field>
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
        <Field>
          <Button type="submit" disabled={loading || !email}>
            {loading ? "Sending..." : "Continue with email"}
          </Button>
        </Field>
        <FieldSeparator>or</FieldSeparator>
        <div className="flex flex-col gap-2">
          <Button type="button" variant="outline" onClick={() => handleOAuthSignIn("google")} disabled={loading}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4 mr-2">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>
          <Button type="button" variant="outline" onClick={() => handleOAuthSignIn("github")} disabled={loading}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4 mr-2">
              <path
                d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
                fill="currentColor"
              />
            </svg>
            Continue with GitHub
          </Button>
          <Button type="button" variant="outline" onClick={() => handleOAuthSignIn("discord")} disabled={loading}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4 mr-2">
              <path
                d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
                fill="currentColor"
              />
            </svg>
            Continue with Discord
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
