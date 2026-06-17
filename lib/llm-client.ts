/**
 * Provider-agnostic LLM client.
 * Tries providers in order: Anthropic → OpenAI → Gemini
 * Throws ALL_PROVIDERS_UNAVAILABLE if every configured provider fails.
 *
 * Callers decide how to handle failure:
 *   - Factories: catch and use rules-based template
 *   - Agents: catch and return degraded/empty output
 *   - APIs: catch and return 503
 */

import Anthropic from "@anthropic-ai/sdk"

export const ALL_PROVIDERS_UNAVAILABLE = "ALL_PROVIDERS_UNAVAILABLE"

export type LLMMessage = { role: "user" | "assistant"; content: string }

export interface LLMOptions {
  /** Anthropic model ID (e.g. "claude-haiku-4-5-20251001"). Fallback providers use their own defaults. */
  model?:        string
  maxTokens?:    number
  systemPrompt?: string
}

/** Single-turn: wrap prompt in a user message and call callLLMChat. */
export async function callLLM(prompt: string, options?: LLMOptions): Promise<string> {
  return callLLMChat([{ role: "user", content: prompt }], options)
}

/** Multi-turn: pass full messages array (for chat routes that maintain history). */
export async function callLLMChat(messages: LLMMessage[], options?: LLMOptions): Promise<string> {
  const maxTokens = options?.maxTokens ?? 2048
  const system    = options?.systemPrompt
  const model     = options?.model ?? "claude-haiku-4-5-20251001"

  // ── 1. Anthropic ─────────────────────────────────────────────────────────────
  if ((process.env.ANTHROPIC_API_KEY ?? "").trim()) {
    try {
      const client = new Anthropic()
      const res = await client.messages.create({
        model,
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages,
      })
      return (res.content[0] as { text: string }).text
    } catch (e) {
      console.warn("[llm-client] Anthropic failed:", String(e))
    }
  }

  // ── 2. OpenAI ─────────────────────────────────────────────────────────────────
  if ((process.env.OPENAI_API_KEY ?? "").trim()) {
    try {
      const oaiMessages: Array<{ role: string; content: string }> = []
      if (system) oaiMessages.push({ role: "system", content: system })
      oaiMessages.push(...messages)

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method:  "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization:  `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ model: "gpt-4o-mini", max_tokens: maxTokens, messages: oaiMessages }),
      })
      if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`)
      const data = await res.json() as { choices: Array<{ message: { content: string } }> }
      return data.choices[0].message.content
    } catch (e) {
      console.warn("[llm-client] OpenAI failed:", String(e))
    }
  }

  // ── 3. Gemini ─────────────────────────────────────────────────────────────────
  if ((process.env.GOOGLE_GEMINI_API_KEY ?? "").trim()) {
    try {
      // Gemini basic API doesn't have native system prompts; prepend to content
      const parts: string[] = []
      if (system) parts.push(`[System: ${system}]`)
      parts.push(...messages.map(m => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`))

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GOOGLE_GEMINI_API_KEY}`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ contents: [{ parts: [{ text: parts.join("\n\n") }] }] }),
        }
      )
      if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`)
      const data = await res.json() as {
        candidates: Array<{ content: { parts: Array<{ text: string }> } }>
      }
      return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""
    } catch (e) {
      console.warn("[llm-client] Gemini failed:", String(e))
    }
  }

  throw new Error(ALL_PROVIDERS_UNAVAILABLE)
}
