import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

const keyResultsSchema = z.object({
  keyResults: z
    .array(
      z.object({
        title: z.string(),
        targetValue: z.number(),
        unit: z.enum(["%", "#", "$", "hrs", "users", "score"]),
        startValue: z.number(),
      })
    )
    .min(2)
    .max(5),
})

const evaluationSchema = z.object({
  score: z.number().min(0).max(2),
  issues: z.array(
    z.object({
      type: z.enum(["objective", "key_result"]),
      target: z.string().optional(),
      issue: z.string(),
      suggestion: z.string(),
    })
  ),
  strengths: z.array(z.string()),
  summary: z.string(),
})

const validationSchema = z.object({
  isValid: z.boolean(),
  issues: z.array(
    z.object({
      field: z.enum(["title", "description"]),
      issue: z.string(),
      hint: z.string(),
    })
  ),
})

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
      response_format: { type: "json_object" },
      messages,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  return data.choices[0]?.message?.content || "{}"
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, data } = body

    if (action === "validateObjective") {
      const { title, description } = data
      const content = await callOpenAI([
        {
          role: "system",
          content: `You evaluate OKR objective titles and descriptions to determine if they're specific enough to generate good key results. Return JSON:
{
  "isValid": boolean,
  "issues": [{ "field": "title" | "description", "issue": "what's wrong", "hint": "how to fix it" }]
}

A GOOD objective:
- Title is specific and outcome-focused (not vague like "Improve X" or "Do Y better")
- Description provides context: why it matters, what success looks like, any constraints
- Together they give enough info to generate measurable key results

Mark as invalid if:
- Title is too vague (e.g., "Improve sales", "Be more efficient")
- Description is missing or too short to provide context
- Can't determine what "done" looks like

Be helpful but not overly strict. 1-2 sentences of context is often enough.`,
        },
        {
          role: "user",
          content: `Evaluate this objective for key result generation:

Title: ${title || "(empty)"}
Description: ${description || "(empty)"}

Can good, specific key results be generated from this?`,
        },
      ])

      const parsed = JSON.parse(content)
      const validated = validationSchema.parse(parsed)
      return NextResponse.json(validated)
    }

    if (action === "generateKeyResults") {
      const { title, description } = data
      const content = await callOpenAI([
        {
          role: "system",
          content: `You generate key results for OKRs. Return JSON with this exact structure:
{
  "keyResults": [
    { "title": "string", "targetValue": number, "unit": "%" | "#" | "$" | "hrs" | "users" | "score", "startValue": number }
  ]
}
Generate 3-5 key results. Units must be one of: %, #, $, hrs, users, score`,
        },
        {
          role: "user",
          content: `Generate key results for:

Title: ${title}
${description ? `Description: ${description}` : ""}

Key results should be specific, measurable, ambitious but achievable, with clear numeric targets.`,
        },
      ])

      const parsed = JSON.parse(content)
      const validated = keyResultsSchema.parse(parsed)
      return NextResponse.json({ keyResults: validated.keyResults })
    }

    if (action === "evaluateOKR") {
      const { title, description, keyResults } = data
      const content = await callOpenAI([
        {
          role: "system",
          content: `You evaluate OKRs and return JSON with this exact structure:
{
  "score": number (0=bad, 1=okay, 2=good),
  "issues": [{ "type": "objective" | "key_result", "target": "optional string", "issue": "string", "suggestion": "string" }],
  "strengths": ["string"],
  "summary": "string"
}`,
        },
        {
          role: "user",
          content: `Evaluate this OKR:

OBJECTIVE: ${title}
${description ? `DESCRIPTION: ${description}` : ""}

KEY RESULTS:
${keyResults.map((kr: { title: string; startValue: number; targetValue: number; unit: string }, i: number) => `${i + 1}. ${kr.title} (${kr.startValue} → ${kr.targetValue} ${kr.unit})`).join("\n")}

Evaluate based on: SPECIFIC, MEASURABLE, ACHIEVABLE, RELEVANT, TIME-BOUND.
Check for: vague objectives, wrong number of KRs (ideal 3-5), tasks instead of outcomes, misaligned metrics.`,
        },
      ])

      const parsed = JSON.parse(content)
      const validated = evaluationSchema.parse(parsed)
      return NextResponse.json(validated)
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error) {
    console.error("[v0] AI API Error:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: `AI request failed: ${message}` }, { status: 500 })
  }
}
