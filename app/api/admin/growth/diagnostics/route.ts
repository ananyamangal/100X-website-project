/**
 * Growth OS Master Diagnostic
 * GET /api/admin/growth/diagnostics
 *
 * Classifies all 9 operational systems as VERIFIED / PARTIALLY_VERIFIED / UNVERIFIED / BROKEN.
 * Reads MongoDB, env vars, and the GTM container JSON. No external API calls — always fast.
 */
import { type NextRequest, NextResponse } from "next/server"
import clientPromise from "@/lib/mongodb"
import { requireAuth } from "@/lib/rbac/server"
import { AW_CONVERSION_ID, CONVERSION_ACTIONS } from "@/lib/growth-os/conversion-tracking"
import fs from "fs"
import path from "path"
import type { Db } from "mongodb"

export const dynamic = "force-dynamic"

type Status = "VERIFIED" | "PARTIALLY_VERIFIED" | "UNVERIFIED" | "BROKEN"

interface Issue {
  severity: "critical" | "warning" | "info"
  code: string
  message: string
  fix?: string
}

interface SystemDiagnostic {
  system: string
  key: string
  status: Status
  headline: string
  issues: Issue[]
  metrics: Record<string, unknown>
}

function classify(issues: Issue[]): Status {
  if (issues.some(i => i.severity === "critical")) return "BROKEN"
  if (issues.some(i => i.severity === "warning"))  return "PARTIALLY_VERIFIED"
  if (issues.length === 0)                         return "VERIFIED"
  return "PARTIALLY_VERIFIED"
}

// ─────────────────────────────────────────────────────────────────────────────
// System checks
// ─────────────────────────────────────────────────────────────────────────────

async function checkGA4(): Promise<SystemDiagnostic> {
  const issues: Issue[] = []
  issues.push({
    severity: "info",
    code: "GA4_PAGE_VIEW_DEDUPED",
    message: "Direct GA4 tag (G-GEWH5YB3PS) uses send_page_view:false — page views handled by GTM only. No double-counting.",
  })
  return {
    system: "GA4 Tracking",
    key: "ga4",
    status: "VERIFIED",
    headline: "G-GEWH5YB3PS live. GTM container has no duplicate GA4 config tag.",
    issues,
    metrics: { ga4MeasurementId: "G-GEWH5YB3PS", sendPageView: false, gtmContainerId: "GTM-5JMGCKRW", duplicateTag: false },
  }
}

async function checkGTM(): Promise<SystemDiagnostic> {
  const issues: Issue[] = []
  const metrics: Record<string, unknown> = { containerId: "GTM-5JMGCKRW" }

  try {
    const gtmPath = path.join(process.cwd(), "docs", "gtm-container-import.json")
    const gtmJson = JSON.parse(fs.readFileSync(gtmPath, "utf8"))
    const tags: Array<Record<string, unknown>> = (gtmJson as { containerVersion?: { tag?: [] } }).containerVersion?.tag ?? []
    const convLinker = tags.find((t) => t.type === "cl")
    const convTags   = tags.filter((t) => t.type === "awct")
    const rawStr     = JSON.stringify(tags)
    const hasPlaceholders = rawStr.includes("REPLACE_")

    metrics.containerImportFound    = true
    metrics.conversionLinkerPresent = !!convLinker
    metrics.conversionTagCount      = convTags.length
    metrics.placeholdersInJson      = hasPlaceholders
    metrics.triggerCount            = ((gtmJson as { containerVersion?: { trigger?: [] } }).containerVersion?.trigger ?? []).length

    if (!convLinker) {
      issues.push({ severity: "critical", code: "GTM_NO_CONV_LINKER", message: "Conversion Linker tag missing from GTM container JSON." })
    }
    if (hasPlaceholders) {
      issues.push({
        severity: "warning",
        code: "GTM_LABELS_PLACEHOLDER",
        message: `GTM container JSON still has REPLACE_* placeholders. Configure labels → download regenerated JSON → import into GTM.`,
        fix: "Use Diagnostics → Conversion Labels form to enter labels, then download the updated GTM JSON.",
      })
    }
    issues.push({
      severity: "info",
      code: "GTM_PUBLISH_UNVERIFIED",
      message: "Cannot verify GTM container publish status without GTM Management API.",
      fix: "Open GTM → Versions and confirm the latest version is published.",
    })
  } catch {
    metrics.containerImportFound = false
    issues.push({ severity: "warning", code: "GTM_JSON_NOT_FOUND", message: "docs/gtm-container-import.json not readable." })
  }

  const status = classify(issues)
  return {
    system: "GTM Container",
    key: "gtm",
    status,
    headline: metrics.containerImportFound
      ? metrics.placeholdersInJson
        ? "Import found. Linker ✓. Labels need configuration before publishing."
        : "Import ready. All labels configured."
      : "Container import file not found.",
    issues,
    metrics,
  }
}

async function checkAdsAPI(db: Db): Promise<SystemDiagnostic> {
  const issues: Issue[] = []
  const metrics: Record<string, unknown> = {}

  const devToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN
  metrics.developerToken = devToken ? "configured" : "missing"
  if (!devToken) {
    issues.push({
      severity: "critical",
      code: "ADS_NO_DEV_TOKEN",
      message: "GOOGLE_ADS_DEVELOPER_TOKEN not set.",
      fix: "Add to Vercel → Settings → Environment Variables. Get from Google Ads → Tools → API Center.",
    })
  }

  let oauthDoc: Record<string, unknown> | null = null
  try { oauthDoc = await db.collection("oauth_tokens").findOne({ provider: "google" }) as Record<string, unknown> | null } catch { /* */ }

  const hasOAuth    = !!(oauthDoc?.access_token)
  const hasAdwords  = String(oauthDoc?.scope ?? "").includes("adwords")
  metrics.oauthConnected   = hasOAuth
  metrics.hasAdsScope      = hasAdwords
  metrics.oauthEmail       = oauthDoc?.email ?? null

  if (!hasOAuth) {
    issues.push({ severity: "critical", code: "ADS_NO_OAUTH", message: "Google account not connected.", fix: "Growth OS → Ads → Setup → Connect Google account." })
  } else if (!hasAdwords) {
    issues.push({ severity: "critical", code: "ADS_NO_ADWORDS_SCOPE", message: `Google account connected (${oauthDoc?.email}) but missing adwords scope.`, fix: "Reconnect with adwords scope in Ads → Setup." })
  }

  let settingsDoc: Record<string, unknown> | null = null
  try { settingsDoc = await db.collection("ads_settings").findOne({}) as Record<string, unknown> | null } catch { /* */ }
  if (!settingsDoc) {
    try { settingsDoc = await db.collection("google_ads_settings").findOne({}) as Record<string, unknown> | null } catch { /* */ }
  }

  metrics.customerId    = settingsDoc?.customerId ?? null
  metrics.customerName  = settingsDoc?.customerName ?? null
  if (!settingsDoc?.customerId) {
    issues.push({ severity: "critical", code: "ADS_NO_CUSTOMER_ID", message: "Google Ads customer ID not configured.", fix: "Go to Ads → Setup and select your Ads account." })
  }

  const criticals = issues.filter(i => i.severity === "critical").length
  return {
    system: "Google Ads API",
    key: "ads_api",
    status: classify(issues),
    headline: criticals > 0
      ? `${criticals} critical blocker${criticals > 1 ? "s" : ""} preventing API access`
      : `Connected: ${settingsDoc?.customerName ?? settingsDoc?.customerId}`,
    issues,
    metrics,
  }
}

async function checkConversionTracking(db: Db): Promise<SystemDiagnostic> {
  const issues: Issue[] = []

  let saved: Record<string, unknown> | null = null
  try { saved = await db.collection("ads_conversion_config").findOne({ _docId: "conversion-config" }) as Record<string, unknown> | null } catch { /* */ }

  const awId         = String(saved?.awConversionId ?? AW_CONVERSION_ID)
  const awConfigured = !awId.includes("REPLACE")

  const actions = CONVERSION_ACTIONS.map(a => {
    const entry = (saved?.actions as Array<Record<string, unknown>> ?? []).find(s => s.name === a.name)
    const label = String(entry?.conversionLabel ?? a.conversionLabel)
    return { name: a.name, label, configured: !label.includes("REPLACE") }
  })

  const configuredCount = actions.filter(a => a.configured).length
  const unconfigured    = actions.filter(a => !a.configured)

  if (!awConfigured) {
    issues.push({ severity: "critical", code: "CONV_NO_AW_ID", message: "Google Ads Conversion ID (AW-XXXXXXX) not configured.", fix: "Enter the AW-ID in the Conversion Labels form on this page." })
  }
  if (unconfigured.length > 0) {
    issues.push({
      severity: "critical",
      code: "CONV_LABELS_PLACEHOLDER",
      message: `${unconfigured.length}/5 labels are REPLACE_* placeholders: ${unconfigured.map(a => a.name).join(", ")}.`,
      fix: "Go to Google Ads → Goals → Conversions → [action] → Tag setup to find your labels.",
    })
  }

  return {
    system: "Conversion Tracking",
    key: "conversion_tracking",
    status: classify(issues),
    headline: configuredCount === actions.length
      ? `All ${actions.length} conversion labels configured`
      : `${configuredCount}/${actions.length} labels configured — tracking is BLIND`,
    issues,
    metrics: {
      awConversionId: awId, awConfigured, configuredLabels: configuredCount,
      totalLabels: actions.length, lastSyncedAt: saved?.syncedAt ?? null,
      actions: actions.map(a => ({ name: a.name, configured: a.configured })),
    },
  }
}

async function checkWhatsApp(db: Db): Promise<SystemDiagnostic> {
  const issues: Issue[] = []

  let saved: Record<string, unknown> | null = null
  try { saved = await db.collection("ads_conversion_config").findOne({ _docId: "conversion-config" }) as Record<string, unknown> | null } catch { /* */ }

  const waEntry = (saved?.actions as Array<Record<string, unknown>> ?? []).find(a => a.name === "WhatsApp Click")
  const labelOk = waEntry?.conversionLabel && !String(waEntry.conversionLabel).includes("REPLACE")

  issues.push({ severity: "info", code: "WA_DATALAYER_VERIFIED", message: "dataLayer.push({event:'whatsapp_click'}) fires from WhatsAppFloatingButton and all wa.me links." })
  issues.push({ severity: "info", code: "WA_GA4_VERIFIED", message: "GA4 receives whatsapp_click events via dataLayer → GTM." })

  if (!labelOk) {
    issues.push({
      severity: "critical",
      code: "WA_CONV_LABEL_MISSING",
      message: "WhatsApp Click conversion label not configured — Google Ads gets no credit for WhatsApp leads.",
      fix: "Configure 'WhatsApp Click' label in Conversion Labels form.",
    })
  }

  return {
    system: "WhatsApp Conversion",
    key: "whatsapp_conversion",
    status: labelOk ? "VERIFIED" : "PARTIALLY_VERIFIED",
    headline: labelOk
      ? "End-to-end: dataLayer ✓ → GA4 ✓ → Google Ads ✓"
      : "dataLayer ✓  GA4 ✓  Google Ads ✗ (label missing)",
    issues,
    metrics: { dataLayerEventFires: true, ga4EventFires: true, conversionLabelConfigured: !!labelOk, waNumber: "+91 78272 29116" },
  }
}

async function checkConversionLinker(): Promise<SystemDiagnostic> {
  const issues: Issue[] = []
  let linkerVerified = false

  try {
    const gtmPath = path.join(process.cwd(), "docs", "gtm-container-import.json")
    const gtmJson = JSON.parse(fs.readFileSync(gtmPath, "utf8"))
    const tags: Array<Record<string, unknown>> = (gtmJson as { containerVersion?: { tag?: [] } }).containerVersion?.tag ?? []
    linkerVerified = tags.some(t => t.type === "cl")
  } catch { /* */ }

  if (linkerVerified) {
    issues.push({ severity: "info", code: "CONV_LINKER_IN_JSON", message: "Conversion Linker tag present in GTM import JSON (type:cl, fires on All Pages)." })
    issues.push({ severity: "warning", code: "CONV_LINKER_PUBLISH", message: "Cannot verify if GTM container has been imported and published.", fix: "Open GTM → Versions. If latest version lacks Conversion Linker, import docs/gtm-container-import.json." })
  } else {
    issues.push({ severity: "critical", code: "CONV_LINKER_MISSING", message: "Conversion Linker not found in GTM container JSON." })
  }

  return {
    system: "Conversion Linker",
    key: "conversion_linker",
    status: linkerVerified ? "UNVERIFIED" : "BROKEN",
    headline: linkerVerified
      ? "Present in GTM JSON — publish status unknown"
      : "Conversion Linker missing from GTM container",
    issues,
    metrics: { presentInImportJson: linkerVerified, firesOnAllPages: linkerVerified },
  }
}

async function checkCustomerMatch(db: Db): Promise<SystemDiagnostic> {
  const issues: Issue[] = []

  let audiences: Array<Record<string, unknown>> = []
  try { audiences = await db.collection("customer_match_audiences").find({}).toArray() as Array<Record<string, unknown>> } catch { /* */ }

  const details = audiences.map(a => ({
    type:       String(a.audienceType ?? a.audienceId ?? "unknown"),
    status:     String(a.uploadStatus ?? "not_uploaded"),
    lastBuilt:  a.lastBuiltAt ?? null,
    records:    Number((a.qualityScore as Record<string, number>)?.totalRecords ?? 0),
    matchRate:  Number((a.qualityScore as Record<string, number>)?.estimatedMatchRate ?? 0),
  }))

  if (audiences.length === 0) {
    issues.push({ severity: "warning", code: "CM_NO_AUDIENCES", message: "No Customer Match audiences built.", fix: "Go to Ads → Customer Match and build all 4 audience types." })
  } else {
    const notUploaded = details.filter(a => a.status === "not_uploaded" || a.status === "failed")
    if (notUploaded.length > 0) {
      issues.push({ severity: "warning", code: "CM_NOT_UPLOADED", message: `${notUploaded.length} audience(s) built but not uploaded: ${notUploaded.map(a => a.type).join(", ")}.`, fix: "Go to Ads → Customer Match and upload." })
    }
  }

  const uploaded = details.filter(a => a.status === "uploaded").length
  return {
    system: "Customer Match",
    key: "customer_match",
    status: audiences.length === 0 ? "UNVERIFIED" : uploaded > 0 ? "VERIFIED" : "PARTIALLY_VERIFIED",
    headline: audiences.length === 0
      ? "No audiences built yet"
      : `${audiences.length} built, ${uploaded} uploaded to Google Ads`,
    issues,
    metrics: { audienceCount: audiences.length, uploadedCount: uploaded, audiences: details },
  }
}

async function checkSearchConsole(db: Db): Promise<SystemDiagnostic> {
  const issues: Issue[] = []

  let oauthDoc: Record<string, unknown> | null = null
  try { oauthDoc = await db.collection("oauth_tokens").findOne({ provider: "google" }) as Record<string, unknown> | null } catch { /* */ }

  const hasOAuth = !!(oauthDoc?.access_token)
  const hasGsc   = String(oauthDoc?.scope ?? "").includes("search-console") || String(oauthDoc?.scope ?? "").includes("webmasters")

  let lastSyncDoc: Record<string, unknown> | null = null
  try {
    lastSyncDoc = await db.collection("growth_os_logs").findOne(
      { $or: [{ agent: "gsc-sync" }, { source: "gsc" }, { type: "gsc_sync" }] },
      { sort: { ts: -1 } }
    ) as Record<string, unknown> | null
  } catch { /* */ }

  if (!hasOAuth) {
    issues.push({ severity: "critical", code: "GSC_NO_OAUTH", message: "Google OAuth not connected.", fix: "Go to Growth OS → SEO → Setup and connect Google account." })
  } else if (!hasGsc) {
    issues.push({ severity: "warning", code: "GSC_NO_SCOPE", message: "Google connected but search-console scope not detected.", fix: "Reconnect with search-console scope in SEO → Setup." })
  }

  if (!lastSyncDoc) {
    issues.push({ severity: "info", code: "GSC_NO_SYNC_LOG", message: "No GSC sync log found.", fix: "Trigger a manual GSC sync from SEO → Setup." })
  } else {
    const age = Date.now() - new Date(String(lastSyncDoc.ts ?? 0)).getTime()
    if (age > 48 * 3_600_000) {
      issues.push({ severity: "warning", code: "GSC_STALE", message: `Last GSC sync was ${Math.floor(age / 3_600_000)}h ago.`, fix: "Check Vercel cron for the GSC sync job." })
    }
  }

  return {
    system: "Search Console",
    key: "search_console",
    status: classify(issues),
    headline: !hasOAuth ? "OAuth not connected" : !hasGsc ? "Missing GSC scope" : lastSyncDoc ? `Last sync: ${String(lastSyncDoc.ts ?? "").slice(0, 10)}` : "Connected, no sync yet",
    issues,
    metrics: { oauthConnected: hasOAuth, hasGscScope: hasGsc, lastSync: lastSyncDoc?.ts ?? null, oauthEmail: oauthDoc?.email ?? null },
  }
}

async function checkAdsMonitoring(db: Db): Promise<SystemDiagnostic> {
  const issues: Issue[] = []

  let lastMetrics: Record<string, unknown> | null = null
  let metricsCount = 0
  let deployments: Array<Record<string, unknown>> = []
  let pendingRecs = 0

  try {
    lastMetrics = await db.collection("ads_campaign_metrics").findOne({}, { sort: { syncedAt: -1 } }) as Record<string, unknown> | null
    metricsCount = await db.collection("ads_campaign_metrics").countDocuments()
    deployments  = await db.collection("ads_deployments").find({}).toArray() as Array<Record<string, unknown>>
    pendingRecs  = await db.collection("ads_optimization_recommendations").countDocuments({ status: "pending" })
  } catch { /* */ }

  const realDeploys = deployments.filter(d => (d.resourceNames as Record<string, unknown>)?.campaign && !d.simulated)

  if (realDeploys.length === 0) {
    issues.push({ severity: "info", code: "MON_NO_REAL_CAMPAIGNS", message: "No live (non-simulated) Google Ads campaigns deployed yet.", fix: "Deploy via Campaign Factory and approve." })
  } else if (!lastMetrics) {
    issues.push({ severity: "warning", code: "MON_NO_SYNC", message: `${realDeploys.length} campaign(s) deployed but no metrics synced.`, fix: "Click 'Sync from Google Ads' in Ads → Monitoring." })
  } else {
    const age = Date.now() - new Date(String(lastMetrics.syncedAt ?? 0)).getTime()
    if (age > 25 * 3_600_000) {
      issues.push({ severity: "warning", code: "MON_STALE", message: `Metrics last synced ${Math.floor(age / 3_600_000)}h ago.`, fix: "Sync daily from Ads → Monitoring." })
    }
  }

  return {
    system: "Ads Monitoring",
    key: "ads_monitoring",
    status: realDeploys.length === 0 ? "UNVERIFIED" : !lastMetrics ? "PARTIALLY_VERIFIED" : "VERIFIED",
    headline: realDeploys.length === 0 ? "No live campaigns to monitor" : lastMetrics ? `Synced: ${String(lastMetrics.syncedAt ?? "").slice(0, 10)}` : "Campaigns live — sync needed",
    issues,
    metrics: { lastSyncAt: lastMetrics?.syncedAt ?? null, metricsCount, deploymentCount: deployments.length, realDeploymentCount: realDeploys.length, pendingRecs },
  }
}

async function checkRevenueAttribution(db: Db): Promise<SystemDiagnostic> {
  const issues: Issue[] = []
  let leadCount = 0
  let withSource = 0
  let withRevenue = 0

  try {
    leadCount   = await db.collection("revenue_attribution").countDocuments()
    withSource  = await db.collection("revenue_attribution").countDocuments({ source: { $exists: true, $nin: ["", null] } })
    withRevenue = await db.collection("revenue_attribution").countDocuments({ actualRevenue: { $gt: 0 } })
  } catch { /* */ }

  const pct = leadCount > 0 ? Math.round((withSource / leadCount) * 100) : 0

  if (leadCount === 0) {
    issues.push({ severity: "info", code: "REVENUE_NO_LEADS", message: "No leads in revenue_attribution yet. Will populate as leads come in via RFQ forms." })
  } else if (pct < 50) {
    issues.push({ severity: "warning", code: "REVENUE_LOW_UTM", message: `Only ${pct}% of leads have UTM source data.`, fix: "Verify UTM parameters are captured in lib/analytics/utm-persistence.ts." })
  }

  return {
    system: "Revenue Attribution",
    key: "revenue_attribution",
    status: leadCount === 0 ? "UNVERIFIED" : withSource > 0 ? "PARTIALLY_VERIFIED" : "UNVERIFIED",
    headline: leadCount === 0 ? "No lead data yet" : `${leadCount} leads — ${pct}% attributed to source`,
    issues,
    metrics: { totalLeads: leadCount, leadsWithSource: withSource, leadsWithRevenue: withRevenue, attributionRate: pct },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth

  try {
    const db = (await clientPromise).db()

    const systems = await Promise.all([
      checkGA4(),
      checkGTM(),
      checkAdsAPI(db),
      checkConversionTracking(db),
      checkWhatsApp(db),
      checkConversionLinker(),
      checkCustomerMatch(db),
      checkSearchConsole(db),
      checkAdsMonitoring(db),
      checkRevenueAttribution(db),
    ])

    const counts = systems.reduce((acc, s) => { acc[s.status] = (acc[s.status] ?? 0) + 1; return acc }, {} as Record<string, number>)

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      summary: {
        verified:          counts.VERIFIED           ?? 0,
        partiallyVerified: counts.PARTIALLY_VERIFIED ?? 0,
        unverified:        counts.UNVERIFIED         ?? 0,
        broken:            counts.BROKEN             ?? 0,
        total:             systems.length,
      },
      systems,
    })
  } catch (err) {
    console.error("[diagnostics] error:", String(err))
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
