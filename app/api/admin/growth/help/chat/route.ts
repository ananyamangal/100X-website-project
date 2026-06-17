import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/rbac/server"
import { buildDocContext, DOC_REGISTRY } from "@/lib/growth-os/doc-registry"
import { CAPABILITY_REGISTRY } from "@/lib/growth-os/platform-registry"
import { callLLMChat, ALL_PROVIDERS_UNAVAILABLE } from "@/lib/llm-client"

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

  const body = await req.json()
  const { messages } = body as { messages: Array<{ role: "user" | "assistant"; content: string }> }

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "messages array required" }, { status: 400 })
  }

  try {
    const text = await callLLMChat(messages, {
      systemPrompt: SYSTEM_PROMPT,
      maxTokens:    1024,
      model:        "claude-haiku-4-5-20251001",
    })
    return NextResponse.json({ reply: text })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const status = msg === ALL_PROVIDERS_UNAVAILABLE ? 503 : 502
    return NextResponse.json(
      { error: "AI service unavailable. Configure ANTHROPIC_API_KEY, OPENAI_API_KEY, or GOOGLE_GEMINI_API_KEY in Vercel." },
      { status }
    )
  }
}
