"use client"

import { useState, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/lib/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/lib/components/ui/field"
import { Input } from "@/lib/components/ui/input"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [step, setStep] = useState<"email" | "otp">("email")
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

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
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) {
      setError(error.message)
    } else {
      setStep("otp")
    }
    setLoading(false)
  }

  async function verifyOtp(code: string) {
    setLoading(true)
    setError("")
    const supabase = createClient()
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    })
    if (error) {
      setError(error.message)
      setOtp(["", "", "", "", "", ""])
      inputRefs.current[0]?.focus()
    }
    setLoading(false)
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

  if (step === "otp") {
    return (
      <form className={cn("flex flex-col gap-6", className)} {...props}>
        <FieldGroup>
          <div className="flex flex-col items-center gap-1 text-center">
            <h1 className="text-2xl font-bold">Check your email</h1>
            <p className="text-muted-foreground text-sm text-balance">
              We sent a code to {email}
            </p>
          </div>
          <Field>
            <FieldLabel className="sr-only">Verification code</FieldLabel>
            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <Input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el }}
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
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
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

  async function handleOAuthSignIn(provider: "google" | "apple") {
    setLoading(true)
    setError("")
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
    }
    setLoading(false)
  }

  return (
    <form className={cn("flex flex-col gap-6", className)} onSubmit={handleEmailSubmit} {...props}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            required
          />
        </Field>
        {error && (
          <p className="text-sm text-destructive text-center">{error}</p>
        )}
        <Field>
          <Button type="submit" disabled={loading || !email}>
            {loading ? "Sending..." : "Continue with email"}
          </Button>
        </Field>
        <FieldSeparator>or</FieldSeparator>
        <Field>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuthSignIn("google")}
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4 mr-2">
              <path
                d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                fill="currentColor"
              />
            </svg>
            Continue with Google
          </Button>
        </Field>
        <Field>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuthSignIn("apple")}
            disabled={loading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4 mr-2">
              <path
                d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                fill="currentColor"
              />
            </svg>
            Continue with Apple
          </Button>
        </Field>
      </FieldGroup>
    </form>
  )
}
