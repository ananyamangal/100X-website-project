/**
 * Conversion Actions — live sync from Google Ads + DB-backed config.
 *
 * GET  — list configured actions (DB first, fallback to placeholders)
 * POST — sync live conversion actions from Google Ads API and save to DB
 */
import { NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { getAdsSettings, searchAds } from "@/lib/google-ads"
import { getValidAccessToken, getStoredTokens } from "@/lib/google-oauth"
import { CONVERSION_ACTIONS, AW_CONVERSION_ID } from "@/lib/growth-os/conversion-tracking"

export const dynamic = "force-dynamic"

const COLL = "ads_conversion_config"

// Extracts AW-XXXXXXXXX/LABEL from a Google Ads event snippet JS string.
function extractFromSnippet(snippet: string): { conversionId: string; label: string } | null {
  const m = snippet.match(/['"]AW-(\d+)\/([^'"]+)['"]/)
  if (!m) return null
  return { conversionId: `AW-${m[1]}`, label: m[2] }
}

// GET — return conversion config (DB-stored live values merged with canonical definitions)
export async function GET() {
  try {
    const db = (await clientPromise).db()
    const saved = await db.collection(COLL).findOne({ _docId: "conversion-config" })

    const actions = CONVERSION_ACTIONS.map(a => {
      const liveEntry = (saved?.actions ?? []).find((s: { name: string }) => s.name === a.name)
      return {
        name:            a.name,
        dataLayerEvent:  a.dataLayerEvent,
        category:        a.category,
        defaultValue:    a.defaultValue,
        description:     a.description,
        isRevenue:       a.isRevenue,
        gtmPageFilter:   a.gtmPageFilter ?? null,
        // live values (from DB) override static placeholders
        conversionLabel: liveEntry?.conversionLabel ?? a.conversionLabel,
        conversionId:    liveEntry?.conversionId    ?? AW_CONVERSION_ID,
        labelConfigured: liveEntry?.conversionLabel
          ? !liveEntry.conversionLabel.includes("REPLACE")
          : !a.conversionLabel.includes("REPLACE"),
        liveSource:      !!liveEntry,
        googleAdsId:     liveEntry?.googleAdsId ?? null,
        googleAdsName:   liveEntry?.googleAdsName ?? null,
      }
    })

    const allLabelsConfigured = actions.every(a => a.labelConfigured)
    const awConfigured = !(saved?.awConversionId ?? AW_CONVERSION_ID).includes("REPLACE")

    return NextResponse.json({
      awConversionId:         saved?.awConversionId ?? AW_CONVERSION_ID,
      awConversionIdConfigured: awConfigured,
      allLabelsConfigured,
      lastSyncedAt: saved?.syncedAt ?? null,
      actions,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// POST — fetch live conversion actions from Google Ads and persist to DB
export async function POST() {
  try {
    const tokens = await getStoredTokens()
    if (!tokens?.scope?.includes("adwords")) {
      return NextResponse.json({ error: "Google Ads scope not connected. Re-authenticate with adwords scope." }, { status: 400 })
    }

    const adsSettings = await getAdsSettings()
    if (!adsSettings?.customerId) {
      return NextResponse.json({ error: "No Google Ads customer ID configured." }, { status: 400 })
    }

    const accessToken = await getValidAccessToken()

    // GAQL: fetch conversion actions with tag snippets so we can extract labels
    const rows = await searchAds(
      adsSettings.customerId,
      `SELECT
         conversion_action.id,
         conversion_action.name,
         conversion_action.status,
         conversion_action.tag_snippets
       FROM conversion_action
       WHERE conversion_action.status IN ('ENABLED', 'HIDDEN')`,
      accessToken,
      adsSettings.loginCustomerId,
    )

    let discoveredConversionId = ""
    const liveActions: Array<{
      name: string
      googleAdsId: string
      googleAdsName: string
      conversionId: string
      conversionLabel: string
    }> = []

    for (const row of rows) {
      const ca = row.conversionAction as Record<string, unknown> | undefined
      if (!ca) continue

      const id   = String(ca.id ?? "")
      const name = String(ca.name ?? "")
      const snippets = (ca.tagSnippets as Array<Record<string, unknown>>) ?? []

      let extracted: { conversionId: string; label: string } | null = null
      for (const snip of snippets) {
        const es = String(snip.eventSnippet ?? snip.event_snippet ?? "")
        extracted = extractFromSnippet(es)
        if (extracted) break
      }

      if (extracted) {
        if (!discoveredConversionId) discoveredConversionId = extracted.conversionId
        liveActions.push({
          name,
          googleAdsId:     id,
          googleAdsName:   name,
          conversionId:    extracted.conversionId,
          conversionLabel: extracted.label,
        })
      }
    }

    // Match live actions to our canonical CONVERSION_ACTIONS by name (case-insensitive)
    const matched = CONVERSION_ACTIONS.map(canonical => {
      const live = liveActions.find(
        l => l.name.toLowerCase().includes(canonical.name.toLowerCase()) ||
             canonical.name.toLowerCase().includes(l.name.toLowerCase())
      )
      return {
        name:            canonical.name,
        googleAdsId:     live?.googleAdsId ?? null,
        googleAdsName:   live?.googleAdsName ?? null,
        conversionId:    live?.conversionId ?? AW_CONVERSION_ID,
        conversionLabel: live?.conversionLabel ?? canonical.conversionLabel,
      }
    })

    const db = (await clientPromise).db()
    const now = new Date().toISOString()
    await db.collection(COLL).updateOne(
      { _docId: "conversion-config" },
      {
        $set: {
          _docId:           "conversion-config",
          awConversionId:   discoveredConversionId || AW_CONVERSION_ID,
          actions:          matched,
          rawLiveActions:   liveActions,
          syncedAt:         now,
          updatedAt:        now,
          customerId:       adsSettings.customerId,
        },
      },
      { upsert: true },
    )

    return NextResponse.json({
      ok:                 true,
      discovered:         liveActions.length,
      matched:            matched.filter(m => m.googleAdsId).length,
      awConversionId:     discoveredConversionId || AW_CONVERSION_ID,
      syncedAt:           now,
    })
  } catch (err) {
    console.error("[conversion-actions] sync error:", String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
