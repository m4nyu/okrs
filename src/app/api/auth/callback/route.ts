import { NextResponse } from "next/server"
import { createClient } from "@/lib/db/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token = searchParams.get("token")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? searchParams.get("redirect_to") ?? "/"

  const supabase = await createClient()

  // Handle OAuth code exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error("Auth callback error:", error.message)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }
    return NextResponse.redirect(`${origin}${next}`)
  }

  // Handle magic link token verification (from OTP flow)
  if (token && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: type as "magiclink" | "email",
    })
    if (error) {
      console.error("Token verification error:", error.message)
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }
    return NextResponse.redirect(`${origin}${next}`)
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`)
}
