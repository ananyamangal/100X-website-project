import { NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { runCreativeDirector, type CreativeDirectorInput } from "@/lib/growth-os/agents/creative-director"

export async function GET() {
  const db = (await clientPromise).db()
  const runs = await db.collection("creative_director_runs")
    .find({})
    .sort({ generatedAt: -1 })
    .limit(20)
    .project({ headlines: 0, descriptions: 0, callouts: 0, snippets: 0, sitelinks: 0, imageConcepts: 0 })
    .toArray()

  return NextResponse.json(JSON.parse(JSON.stringify(runs)))
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<CreativeDirectorInput> & { runId?: string }

  // Full run
  if (body.product && body.objective && body.audience) {
    const input: CreativeDirectorInput = {
      product:        body.product,
      landingPage:    body.landingPage ?? "",
      objective:      body.objective,
      audience:       body.audience,
      keywordCluster: body.keywordCluster ?? [],
      notes:          body.notes,
      model:          body.model,  // "haiku" | "sonnet" | "opus"
    }

    try {
      const run = await runCreativeDirector(input)
      return NextResponse.json({ ok: true, run })
    } catch (err) {
      return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 })
    }
  }

  // Fetch a specific saved run
  if (body.runId) {
    const db = (await clientPromise).db()
    const run = await db.collection("creative_director_runs").findOne({ runId: body.runId })
    if (!run) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json(JSON.parse(JSON.stringify(run)))
  }

  return NextResponse.json({ error: "product, objective, and audience are required" }, { status: 400 })
}
