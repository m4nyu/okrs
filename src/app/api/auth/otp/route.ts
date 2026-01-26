import { NextResponse } from "next/server"
import { createClient } from "@/lib/db/server"

export async function POST(request: Request) {
  const { email, code } = await request.json()
  const supabase = await createClient()

  // Verify OTP using Supabase's built-in verification
  if (code) {
    const { error } = await supabase.auth.verifyOtp({
      email: email.toLowerCase(),
      token: code,
      type: "email",
    })

    if (error) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 })
    }

    return NextResponse.json({ success: true, verified: true })
  }

  // Send OTP using Supabase's built-in OTP (stored in their DB, not memory)
  const { error } = await supabase.auth.signInWithOtp({
    email: email.toLowerCase(),
    options: {
      shouldCreateUser: true,
    },
  })

  if (error) {
    console.error("OTP error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
