import clientPromise from "@/lib/mongodb"

const TARGET_QUERIES = [
  "OEM authorization letter fogging machine India",
  "GeM dealer authorization fogging machine",
  "thermal fogging machine manufacturer India",
  "IS 14855 fogging machine",
  "municipal fogging machine GeM India",
  "NHM fogging machine procurement",
  "Make in India fogging machine OEM",
  "fogging machine for Nagar Panchayat",
  "vector control equipment GeM India",
  "MSME fogging machine manufacturer GeM",
]

const BRAND_SIGNALS = ["100x circle", "100xcircle", "100x", "instafog"]

async function queryOpenAI(question: string, apiKey: string): Promise<{ mentioned: boolean; response: string; competitors: string[] }> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: `${question}\n\nPlease mention any specific Indian manufacturers or brands you know about.` }
      ],
      max_tokens: 300,
      temperature: 0.3,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`)
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  const text = (data.choices?.[0]?.message?.content || "").toLowerCase()
  const mentioned = BRAND_SIGNALS.some(s => text.includes(s))
  const knownCompetitors = ["instafog", "foggers india", "glvm", "neptune", "korean", "german", "igeba"]
  const competitors = knownCompetitors.filter(c => c !== "instafog" && text.includes(c))
  if (!mentioned && text.includes("instafog")) competitors.push("instafog")
  return { mentioned, response: data.choices?.[0]?.message?.content || "", competitors }
}

export interface AICitationResult {
  summary: string
  queriesChecked: number
  mentionedCount: number
  missingCount: number
  visibilityScore: number
  results: Array<{
    query: string
    platform: string
    status: "mentioned" | "competitor" | "missing" | "manual_needed"
    competitors: string[]
    checkedAt: string
    note: string
  }>
  trend: { previous?: number; current: number; change?: number }
}

export async function runAICitationAgent(): Promise<AICitationResult> {
  const db = (await clientPromise).db()
  const openAiKey = process.env.OPENAI_API_KEY
  const results: AICitationResult["results"] = []

  if (openAiKey) {
    // Real mode: actually query OpenAI
    for (const query of TARGET_QUERIES.slice(0, 5)) { // limit to 5 to avoid timeout + cost
      try {
        const { mentioned, response, competitors } = await queryOpenAI(query, openAiKey)
        results.push({
          query,
          platform: "ChatGPT",
          status: mentioned ? "mentioned" : competitors.length > 0 ? "competitor" : "missing",
          competitors,
          checkedAt: new Date().toISOString(),
          note: mentioned ? "100X Circle mentioned in response" : `Not mentioned${competitors.length > 0 ? ` — competitors: ${competitors.join(", ")}` : ""}`,
        })
        // Store in citation DB
        await db.collection("growth_os_citations").updateOne(
          { query, platform: "ChatGPT" },
          { $set: { query, platform: "ChatGPT", status: mentioned ? "mentioned" : "missing", competitors, response: response.slice(0, 500), checkedAt: new Date().toISOString() } },
          { upsert: true }
        )
        await new Promise(r => setTimeout(r, 500)) // rate limit
      } catch (e) {
        results.push({ query, platform: "ChatGPT", status: "manual_needed", competitors: [], checkedAt: new Date().toISOString(), note: `API error: ${e instanceof Error ? e.message : "unknown"}` })
      }
    }
    // Remaining queries: mark as manual_needed
    for (const query of TARGET_QUERIES.slice(5)) {
      const existing = await db.collection("growth_os_citations").findOne({ query, platform: "ChatGPT" })
      if (existing) {
        results.push({ query, platform: "ChatGPT", status: existing.status, competitors: existing.competitors || [], checkedAt: existing.checkedAt, note: "From previous check" })
      } else {
        results.push({ query, platform: "ChatGPT", status: "manual_needed", competitors: [], checkedAt: new Date().toISOString(), note: "Not yet checked — use GEO module to log manually" })
      }
    }
  } else {
    // Manual mode: load existing citations and mark unchecked as needing manual review
    for (const query of TARGET_QUERIES) {
      const existing = await db.collection("growth_os_citations").findOne({ query })
      if (existing) {
        results.push({ query, platform: existing.platform || "Manual", status: existing.status, competitors: existing.competitors || [], checkedAt: existing.checkedAt, note: existing.notes || "Manual log" })
      } else {
        results.push({ query, platform: "Manual needed", status: "manual_needed", competitors: [], checkedAt: new Date().toISOString(), note: "Open GEO Command Center → Log Citation Check to record this query" })
      }
    }
  }

  const mentioned = results.filter(r => r.status === "mentioned").length
  const total = results.filter(r => r.status !== "manual_needed").length || 1
  const current = Math.round((mentioned / total) * 100)

  // Get previous score
  const prevRun = await db.collection("growth_os_citation_runs").findOne({}, { sort: { createdAt: -1 } })
  const previous = prevRun?.visibilityScore

  // Store this run
  await db.collection("growth_os_citation_runs").insertOne({
    visibilityScore: current,
    mentionedCount: mentioned,
    totalChecked: total,
    mode: openAiKey ? "api" : "manual",
    createdAt: new Date().toISOString(),
  })

  // Create opportunity if score is low
  if (current < 30 && total > 5) {
    await db.collection("growth_os_opportunities").updateOne(
      { title: { $regex: "AI visibility score", $options: "i" } },
      {
        $setOnInsert: {
          title: `AI Visibility Score is low: ${current}% — improve ChatGPT/Perplexity citations`,
          description: `100X Circle appears in only ${mentioned}/${total} checked AI queries. Competitors (instafog, foggersindia) are being cited instead. Improve llms.txt coverage and structured data.`,
          module: "geo",
          source: "agent",
          businessValue: "high",
          seoValue: "medium",
          geoValue: "high",
          dealerImpact: "medium",
          effort: "medium",
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      },
      { upsert: true }
    )
  }

  const summary = openAiKey
    ? `Checked ${results.length} queries via ChatGPT API. Mentioned in: ${mentioned}/${total}. AI Visibility Score: ${current}%.${previous !== undefined ? ` (was ${previous}%)` : ""}`
    : `Manual mode (no OPENAI_API_KEY). ${mentioned} queries logged as cited, ${results.filter(r => r.status === "manual_needed").length} need manual checking via GEO Command Center.`

  await db.collection("growth_os_logs").insertOne({
    ts: new Date().toISOString(),
    agent: "AI Citation Agent",
    action: `AI citation check: ${current}% visibility score`,
    reason: openAiKey ? "Automated ChatGPT API query" : "Manual mode — pending manual checks",
    expectedImpact: "Track and improve AI search visibility",
    actualImpact: `${mentioned} mentions found out of ${total} checked`,
    level: current >= 50 ? "success" : current >= 20 ? "warning" : "info",
    module: "geo",
    after: JSON.stringify({ score: current, mentioned, total, mode: openAiKey ? "api" : "manual" }),
  })

  return {
    summary,
    queriesChecked: results.length,
    mentionedCount: mentioned,
    missingCount: results.filter(r => r.status === "missing").length,
    visibilityScore: current,
    results,
    trend: { previous, current, change: previous !== undefined ? current - previous : undefined },
  }
}
