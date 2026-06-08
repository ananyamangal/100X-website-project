import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"

export const dynamic = "force-dynamic"

export async function GET() {
  const apiKey = process.env.ANTHROPIC_API_KEY
  const configured = !!apiKey
  const model = "claude-sonnet-4-6"
  const environment = process.env.VERCEL_ENV || process.env.NODE_ENV || "development"

  try {
    const db = (await clientPromise).db()
    const logColl = db.collection("gem_procurement_ai_log")

    const [lastSuccess, lastError] = await Promise.all([
      logColl.findOne({ success: true }, { sort: { ts: -1 } }),
      logColl.findOne({ success: false }, { sort: { ts: -1 } }),
    ])

    return NextResponse.json({
      model,
      configured,
      api_key_detected: configured,
      environment,
      last_query: lastSuccess
        ? {
            question:     lastSuccess.question,
            collection:   lastSuccess.collection,
            result_count: lastSuccess.result_count,
            pipeline_stages: lastSuccess.pipeline_stages,
            confidence:   lastSuccess.confidence,
            fallback:     lastSuccess.fallback ?? false,
            ts:           lastSuccess.ts,
          }
        : null,
      last_error: lastError
        ? {
            question: lastError.question,
            error:    lastError.error,
            ts:       lastError.ts,
          }
        : null,
      status: configured ? "ready" : "fallback",
    })
  } catch {
    return NextResponse.json({
      model,
      configured,
      api_key_detected: configured,
      environment,
      last_query:  null,
      last_error:  null,
      status: configured ? "db_error" : "fallback",
    })
  }
}
