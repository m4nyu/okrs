import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/db/server"

const otpStore = new Map<string, { code: string; expires: number }>()

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function otpEmail(code: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 400px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, #18181b 0%, #27272a 100%); border-radius: 12px 12px 0 0;">
              <span style="color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">⊚ OKR</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #18181b; text-align: center;">
                Your login code
              </h1>
              <p style="margin: 0 0 30px; font-size: 14px; color: #71717a; text-align: center;">
                Enter this code to sign in
              </p>
              <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <div style="font-family: monospace; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #18181b;">
                  ${code}
                </div>
              </div>
              <p style="margin: 0; font-size: 13px; color: #a1a1aa; text-align: center;">
                Expires in 10 minutes
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #fafafa; border-radius: 0 0 12px 12px; border-top: 1px solid #f4f4f5;">
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                Didn't request this? Ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function POST(request: Request) {
  const { email, code } = await request.json()
  const supabase = createAdminClient()

  // Verify OTP
  if (code) {
    const stored = otpStore.get(email.toLowerCase())
    if (!stored || stored.code !== code || Date.now() > stored.expires) {
      return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 })
    }
    otpStore.delete(email.toLowerCase())

    // Get or create user
    const { data: { users } } = await supabase.auth.admin.listUsers()
    let user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase())

    if (!user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        email_confirm: true,
      })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      user = data.user
    }

    // Generate a magic link and extract the token
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: email.toLowerCase(),
    })
    if (linkError) return NextResponse.json({ error: linkError.message }, { status: 400 })

    // The hashed_token can be used to verify - redirect to callback
    const url = new URL(linkData.properties.action_link)
    const token = url.searchParams.get("token")
    const type = url.searchParams.get("type")

    return NextResponse.json({
      token,
      type,
      redirectUrl: `/api/auth/callback?token=${token}&type=${type}&redirect_to=/`
    })
  }

  // Send OTP
  const otp = generateOTP()
  otpStore.set(email.toLowerCase(), { code: otp, expires: Date.now() + 10 * 60 * 1000 })

  try {
    const { Resend } = await import("resend")
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "OKR <noreply@okrs.dev>",
      to: email.toLowerCase(),
      subject: "Your OKR login code",
      html: otpEmail(otp),
    })

    if (sendError) {
      console.error("Resend error:", sendError)
      otpStore.delete(email.toLowerCase())
      return NextResponse.json({ error: sendError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Failed to send OTP:", e)
    otpStore.delete(email.toLowerCase())
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
