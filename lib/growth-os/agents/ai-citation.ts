import clientPromise from "@/lib/mongodb"
import { TARGET_QUERIES, AI_PLATFORMS } from "@/lib/growth-os/citation-constants"

export { TARGET_QUERIES, AI_PLATFORMS }

function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const mon = new Date(d.setDate(diff))
  return mon.toISOString().split("T")[0]
}

function getNextMonday(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 1 : 8 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split("T")[0]
}

export interface AICitationResult {
  summary: string
  totalCombinations: number
  checked: number
  unchecked: number
  stale: number
  mentioned: number
  missing: number
  competitor: number
  visibilityScore: number
  weeklyQueueCreated: number
  tasksThisWeek: Array<{ query: string; platform: string; dueDate: string; priority: string; reason: string }>
  topMisses: Array<{ query: string; platform: string; competitor?: string; lastChecked?: string }>
}

export async function runAICitationAgent(): Promise<AICitationResult> {
  const db = (await clientPromise).db()

  const totalCombinations = TARGET_QUERIES.length * AI_PLATFORMS.length

  // 1. Read all existing citation records from MongoDB
  const existingCitations = await db.collection("growth_os_citations").find({}).toArray()

  // 2. Build lookup map
  const citationMap = new Map<string, typeof existingCitations[0]>()
  for (const c of existingCitations) {
    citationMap.set(`${c.platform}::${c.query}`, c)
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const missingRecords: Array<{ query: string; platform: string }> = []
  const staleRecords: Array<{ query: string; platform: string; lastChecked: string }> = []
  const tasksToCreate: Array<{ query: string; platform: string; reason: string; priority: string }> = []

  // 3. Audit each query × platform combination
  for (const query of TARGET_QUERIES) {
    for (const platform of AI_PLATFORMS) {
      const key = `${platform}::${query}`
      const existing = citationMap.get(key)

      if (!existing) {
        missingRecords.push({ query, platform })
        tasksToCreate.push({ query, platform, reason: "never_checked", priority: "high" })
      } else if (existing.checkedAt && existing.checkedAt < sevenDaysAgo) {
        staleRecords.push({ query, platform, lastChecked: existing.checkedAt })
        tasksToCreate.push({ query, platform, reason: "stale_7d", priority: "medium" })
      }
    }
  }

  // 4. Write verification tasks to MongoDB (upsert — no duplicate pending tasks per week)
  const weekStart = getWeekStart()
  const dueDate = getNextMonday()
  let weeklyQueueCreated = 0

  // Prioritize: never_checked first, then stale. Cap at 15 tasks/week.
  const tasksToWrite = [
    ...tasksToCreate.filter(t => t.priority === "high"),
    ...tasksToCreate.filter(t => t.priority === "medium"),
  ].slice(0, 15)

  for (const task of tasksToWrite) {
    const result = await db.collection("growth_os_citation_tasks").updateOne(
      { query: task.query, platform: task.platform, weekOf: weekStart, status: "pending" },
      {
        $setOnInsert: {
          query: task.query,
          platform: task.platform,
          weekOf: weekStart,
          dueDate,
          reason: task.reason,
          priority: task.priority,
          status: "pending",
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true }
    )
    if (result.upsertedCount > 0) weeklyQueueCreated++
  }

  // 5. Compute visibility score from all checked citations
  const checkedCitations = existingCitations.filter(c => c.status && c.status !== "unknown")
  const mentioned = checkedCitations.filter(c => c.status === "mentioned").length
  const missingCount = checkedCitations.filter(c => c.status === "missing").length
  const competitorCount = checkedCitations.filter(c => c.status === "competitor").length
  const visibilityScore = checkedCitations.length > 0
    ? Math.round((mentioned / checkedCitations.length) * 100)
    : 0

  // 6. Get this week's pending tasks for the return value
  const pendingTasks = await db
    .collection("growth_os_citation_tasks")
    .find({ weekOf: weekStart, status: "pending" })
    .sort({ priority: -1, createdAt: 1 })
    .limit(15)
    .toArray()

  // 7. Find top misses (queries where competitor was cited or 100X was missing)
  const topMisses = existingCitations
    .filter(c => c.status === "missing" || c.status === "competitor")
    .sort((a, b) => (b.checkedAt || "").localeCompare(a.checkedAt || ""))
    .slice(0, 5)
    .map(c => ({
      query: c.query as string,
      platform: c.platform as string,
      competitor: c.competitor as string | undefined,
      lastChecked: c.checkedAt as string | undefined,
    }))

  // 8. Create opportunity if visibility is low and we have enough data
  if (checkedCitations.length >= 5 && visibilityScore < 30) {
    await db.collection("growth_os_opportunities").updateOne(
      { title: { $regex: "AI Visibility Score", $options: "i" } },
      {
        $setOnInsert: {
          title: `AI Visibility Score is ${visibilityScore}% — improve ChatGPT/Gemini citations`,
          description: `100X Circle appears in only ${mentioned}/${checkedCitations.length} checked AI queries. ${competitorCount} queries show competitors instead. Focus: add more content targeting checked queries, publish llms.txt updates, and verify citations weekly.`,
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
        },
      },
      { upsert: true }
    )
  }

  const summary = `Citation audit: ${checkedCitations.length}/${totalCombinations} combinations checked. Visibility: ${visibilityScore}%. ${missingRecords.length} never checked, ${staleRecords.length} stale (>7 days). Created ${weeklyQueueCreated} new verification tasks for week of ${weekStart}.`

  await db.collection("growth_os_logs").insertOne({
    ts: new Date().toISOString(),
    agent: "AI Citation Agent",
    action: summary,
    reason: "Weekly citation database audit and task generation",
    expectedImpact: "Ensure all queries × platforms are verified weekly",
    actualImpact: `${weeklyQueueCreated} tasks queued, ${checkedCitations.length} records analyzed`,
    level: visibilityScore >= 50 ? "success" : visibilityScore >= 20 ? "warning" : "info",
    module: "geo",
    after: JSON.stringify({ visibilityScore, mentioned, missingCount, competitorCount, weeklyQueueCreated }),
  })

  return {
    summary,
    totalCombinations,
    checked: checkedCitations.length,
    unchecked: missingRecords.length,
    stale: staleRecords.length,
    mentioned,
    missing: missingCount,
    competitor: competitorCount,
    visibilityScore,
    weeklyQueueCreated,
    tasksThisWeek: pendingTasks.map(t => ({
      query: t.query as string,
      platform: t.platform as string,
      dueDate: t.dueDate as string,
      priority: t.priority as string,
      reason: t.reason as string,
    })),
    topMisses,
  }
}
