import { NextResponse } from "next/server"
import { createClient } from "@/lib/db/server"

async function callOpenAI(messages: { role: string; content: string }[]) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OpenAI API key not configured")
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 50,
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || ""
}

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const email = user.email
  const _domain = email.split("@")[1] || ""
  const _username = email.split("@")[0] || ""

  // Generate short UUID prefix
  const uuid = Math.random().toString(36).substring(2, 8)

  try {
    const word = await callOpenAI([
      {
        role: "system",
        content:
          "You generate ONE creative, fun, memorable single word or compound word. Output ONLY the word, nothing else. No quotes, no punctuation, no explanation.",
      },
      {
        role: "user",
        content: `Generate ONE creative, fun, memorable word for an organization name. Examples: Moonshot, Hyperion, Nebula, Axiom, Catalyst, Quantum, Vertex, Forge, Spark, Horizon, Prism, Flux.

Be creative! Output just the word, nothing else.`,
      },
    ])

    const name = `${uuid}-${word
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, "")}`
    return NextResponse.json({ name })
  } catch (_error) {
    // Fallback to simple name generation if AI fails
    const fallbackWords = ["spark", "forge", "pulse", "nexus", "orbit", "flux", "apex", "nova", "bolt", "wave"]
    const fallbackWord = fallbackWords[Math.floor(Math.random() * fallbackWords.length)]
    return NextResponse.json({ name: `${uuid}-${fallbackWord}` })
  }
}
