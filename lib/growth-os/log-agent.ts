import type { Db } from "mongodb"

const MAX_LOG_ENTRIES = 1000

interface LogEntry {
  agent: string
  action: string
  reason: string
  expectedImpact: string
  actualImpact: string
  level: "success" | "warning" | "error" | "info"
  module: string
  after?: string
}

export async function logAgentRun(db: Db, entry: LogEntry): Promise<void> {
  await db.collection("growth_os_logs").insertOne({
    ts: new Date().toISOString(),
    ...entry,
  })

  // Keep collection bounded: trim to MAX_LOG_ENTRIES after each insert
  const count = await db.collection("growth_os_logs").countDocuments()
  if (count > MAX_LOG_ENTRIES) {
    const excess = count - MAX_LOG_ENTRIES
    const oldest = await db
      .collection("growth_os_logs")
      .find({})
      .sort({ ts: 1 })
      .limit(excess)
      .project({ _id: 1 })
      .toArray()
    if (oldest.length > 0) {
      await db.collection("growth_os_logs").deleteMany({
        _id: { $in: oldest.map(d => d._id) },
      })
    }
  }
}
