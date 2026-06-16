import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/rbac/server"
import { buildDocContext, DOC_REGISTRY } from "@/lib/growth-os/doc-registry"
import { CAPABILITY_REGISTRY } from "@/lib/growth-os/platform-registry"

const SYSTEM_PROMPT = `You are Growth OS Assistant — an AI advisor embedded inside 100x Circle's internal Growth OS platform.

You answer questions about how to use the platform, what each module does, what actions to take, and how workflows connect.

PLATFORM CONTEXT:
${buildDocContext()}

PLATFORM STATS:
- ${CAPABILITY_REGISTRY.filter(c => c.status === "active").length} active capabilities
- 53 MongoDB collections
- 7 scheduled automations (crons)
- Founder = sulabh.mangal@gmail.com (superadmin)

RESPONSE RULES:
- Be concise and actionable. Max 3–4 short paragraphs.
- When referencing a page, include its route so the founder can navigate directly.
- If asked "what should I do today?", direct to /admin/growth/help/today
- If you don't know something, say so clearly — don't invent platform features.
- Use plain language. No jargon.
- For revenue questions: always check Revenue Director (/admin/growth/director) first.
- For data questions: point to Fogging Intelligence (/admin/growth/fogging) or Procurement Intel.`

export async function POST(req: NextRequest) {
  const authError = await requireAuth(req)
  if (authError) return authError

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured. Set it in Vercel environment variables to enable AI chat." },
      { status: 503 }
    )
  }

  const body = await req.json()
  const { messages } = body as { messages: Array<{ role: "user" | "assistant"; content: string }> }

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 })
  }

  // Build Anthropic request
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    return NextResponse.json({ error: `AI service error: ${response.status}` }, { status: 502 })
  }

  const data = await response.json()
  const text = data.content?.[0]?.text ?? "No response"

  return NextResponse.json({ reply: text })
}
