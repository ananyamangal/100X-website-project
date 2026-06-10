/**
 * Google Ads API — mutate client (non-serving entity creation).
 *
 * Extends lib/google-ads.ts (read-only) with write operations.
 * ALL created entities are non-serving by design:
 *   - CampaignBudget: inert (campaign is PAUSED)
 *   - Campaign: PAUSED — never ENABLED by this module
 *   - AdGroups, Keywords, Ads: within a PAUSED campaign, they don't serve
 *
 * The only code path that enables a campaign is `enableCampaignPostApproval`,
 * which is called exclusively by the human-approval route.
 *
 * Required env var: GOOGLE_ADS_DEVELOPER_TOKEN
 */

import { getDeveloperToken } from "@/lib/google-ads"

const API_VERSION = "v24"
const BASE = `https://googleads.googleapis.com/${API_VERSION}`

// ── Auth headers ────────────────────────────────────────────────────────────

function adsHeaders(accessToken: string, loginCustomerId?: string): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "developer-token": getDeveloperToken(),
    "Content-Type": "application/json",
  }
  if (loginCustomerId) h["login-customer-id"] = loginCustomerId
  return h
}

// ── Types ───────────────────────────────────────────────────────────────────

export interface MutateResult {
  resourceName: string
}

export interface BatchMutateResult {
  campaignBudget?: string
  campaign?: string
  adGroups: string[]
  adGroupCriteria: string[]
  campaignCriteria: string[]
  ads: string[]
}

interface MutateResponse {
  mutateOperationResponses: Array<{
    campaignBudgetResult?: { resourceName: string }
    campaignResult?: { resourceName: string }
    adGroupResult?: { resourceName: string }
    adGroupCriterionResult?: { resourceName: string }
    campaignCriterionResult?: { resourceName: string }
    adGroupAdResult?: { resourceName: string }
  }>
}

// ── Core mutate call ────────────────────────────────────────────────────────

async function mutate(
  customerId: string,
  operations: Record<string, unknown>[],
  accessToken: string,
  loginCustomerId?: string,
): Promise<MutateResponse> {
  const url = `${BASE}/customers/${customerId}/googleAds:mutate`
  const res = await fetch(url, {
    method: "POST",
    headers: adsHeaders(accessToken, loginCustomerId),
    body: JSON.stringify({ mutateOperations: operations }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Ads mutate ${res.status} (customer ${customerId}): ${text.slice(0, 2000)}`)
  }
  return res.json() as Promise<MutateResponse>
}

// ── Remove (rollback) ───────────────────────────────────────────────────────

async function mutateRemove(
  customerId: string,
  resourceNames: string[],
  operationKey: string,
  accessToken: string,
  loginCustomerId?: string,
): Promise<void> {
  if (resourceNames.length === 0) return
  const ops = resourceNames.map(rn => ({
    [operationKey]: { remove: rn },
  }))
  await mutate(customerId, ops, accessToken, loginCustomerId)
}

// ── Step 1: Create campaign budget (inert — campaign will be PAUSED) ────────

export async function createCampaignBudget(
  customerId: string,
  accessToken: string,
  opts: { name: string; amountMicros: number; loginCustomerId?: string },
): Promise<string> {
  const resp = await mutate(
    customerId,
    [{
      campaignBudgetOperation: {
        create: {
          name: opts.name,
          amountMicros: String(opts.amountMicros),
          deliveryMethod: "STANDARD",
        },
      },
    }],
    accessToken,
    opts.loginCustomerId,
  )
  const rn = resp.mutateOperationResponses[0]?.campaignBudgetResult?.resourceName
  if (!rn) throw new Error("Ads mutate: no campaignBudget resourceName returned")
  return rn
}

// ── Step 2: Create PAUSED Search campaign ──────────────────────────────────

export async function createPausedSearchCampaign(
  customerId: string,
  accessToken: string,
  opts: {
    name: string
    budgetResourceName: string
    loginCustomerId?: string
  },
): Promise<string> {
  const resp = await mutate(
    customerId,
    [{
      campaignOperation: {
        create: {
          name: opts.name,
          status: "PAUSED",
          advertisingChannelType: "SEARCH",
          campaignBudget: opts.budgetResourceName,
          manualCpc: { enhancedCpcEnabled: false },
          networkSettings: {
            targetGoogleSearch: true,
            targetSearchNetwork: false,
            targetContentNetwork: false,
          },
          containsEuPoliticalAdvertising: "DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING",
        },
      },
    }],
    accessToken,
    opts.loginCustomerId,
  )
  const rn = resp.mutateOperationResponses[0]?.campaignResult?.resourceName
  if (!rn) throw new Error("Ads mutate: no campaign resourceName returned")
  return rn
}

// ── Step 3: Create ad groups ────────────────────────────────────────────────

export async function createAdGroups(
  customerId: string,
  accessToken: string,
  opts: {
    groups: Array<{ name: string }>
    campaignResourceName: string
    loginCustomerId?: string
  },
): Promise<string[]> {
  const ops = opts.groups.map(g => ({
    adGroupOperation: {
      create: {
        name: g.name,
        campaign: opts.campaignResourceName,
        status: "ENABLED",
        type: "SEARCH_STANDARD",
      },
    },
  }))
  const resp = await mutate(customerId, ops, accessToken, opts.loginCustomerId)
  return resp.mutateOperationResponses.map((r, i) => {
    const rn = r.adGroupResult?.resourceName
    if (!rn) throw new Error(`Ads mutate: no adGroup resourceName at index ${i}`)
    return rn
  })
}

// ── Step 4: Create keywords (positive) ─────────────────────────────────────

// DEFAULT_KEYWORD_CPC_MICROS: ₹15 starting bid for India B2B niche keywords.
// The prior ₹0.01 (10,000 micros) was a placeholder that caused zero impressions —
// India B2B CPC floor for industrial equipment keywords is ~₹10-15.
export const DEFAULT_KEYWORD_CPC_MICROS = 15_000_000  // ₹15

export interface DeploymentAuditEntry {
  keyword:             string
  source?:             string
  theme?:              string
  deploymentEligible:  boolean
  rejectionReason?:    string
  rejectionCategory?:  string
}

// Last-resort deployment gate: validates every keyword immediately before the Google Ads
// mutate call. This fires even if the upstream pipeline already ran the validator, because
// the FUV config fallback path and older keyword runs can bypass the intelligence pipeline.
// Any keyword that reaches here without passing the eligibility check is silently dropped
// from this batch; the rejection is returned in `rejections` so callers can log it.
export async function createKeywords(
  customerId: string,
  accessToken: string,
  opts: {
    keywords: Array<{
      adGroupResourceName: string
      text:                string
      matchType:           "EXACT" | "PHRASE" | "BROAD"
      cpcBidMicros?:       number
      source?:             string  // for audit logging
      theme?:              string  // for audit logging
    }>
    loginCustomerId?: string
    skipValidation?:  boolean       // true only in tests — never in production
  },
): Promise<{ resourceNames: string[]; rejections: DeploymentAuditEntry[] }> {
  const rejections: DeploymentAuditEntry[] = []
  let eligible = opts.keywords

  // Hard deployment gate — runs unless caller explicitly opts out (test only)
  if (!opts.skipValidation) {
    const { validateKeyword } = await import("@/lib/growth-os/ads-keyword-validator")
    const filtered: typeof opts.keywords = []
    for (const kw of opts.keywords) {
      const v = validateKeyword(kw.text)
      if (v.eligible) {
        filtered.push(kw)
      } else {
        rejections.push({
          keyword:            kw.text,
          source:             kw.source,
          theme:              kw.theme,
          deploymentEligible: false,
          rejectionReason:    v.rejectionReason,
          rejectionCategory:  v.rejectionCategory,
        })
      }
    }
    eligible = filtered
  }

  if (eligible.length === 0) return { resourceNames: [], rejections }

  const ops = eligible.map(kw => ({
    adGroupCriterionOperation: {
      create: {
        adGroup:     kw.adGroupResourceName,
        status:      "ENABLED",
        cpcBidMicros: String(kw.cpcBidMicros ?? DEFAULT_KEYWORD_CPC_MICROS),
        keyword:     { text: kw.text, matchType: kw.matchType },
      },
    },
  }))
  const resp = await mutate(customerId, ops, accessToken, opts.loginCustomerId)
  const resourceNames = resp.mutateOperationResponses.map((r, i) => {
    const rn = r.adGroupCriterionResult?.resourceName
    if (!rn) throw new Error(`Ads mutate: no criterion resourceName at index ${i}`)
    return rn
  })
  return { resourceNames, rejections }
}

// ── Step 5: Create campaign-level criteria (geo + negative keywords) ────────

export async function createCampaignCriteria(
  customerId: string,
  accessToken: string,
  opts: {
    campaignResourceName: string
    geoTargetConstant: string
    negativeKeywords: string[]
    loginCustomerId?: string
  },
): Promise<string[]> {
  const ops: Record<string, unknown>[] = [
    {
      campaignCriterionOperation: {
        create: {
          campaign: opts.campaignResourceName,
          location: { geoTargetConstant: opts.geoTargetConstant },
        },
      },
    },
    ...opts.negativeKeywords.map(text => ({
      campaignCriterionOperation: {
        create: {
          campaign: opts.campaignResourceName,
          negative: true,
          keyword: { text, matchType: "BROAD" },
        },
      },
    })),
  ]
  const resp = await mutate(customerId, ops, accessToken, opts.loginCustomerId)
  return resp.mutateOperationResponses.map(r => r.campaignCriterionResult?.resourceName ?? "")
}

// ── Step 6: Create RSA ads ──────────────────────────────────────────────────

export async function createRSAAds(
  customerId: string,
  accessToken: string,
  opts: {
    ads: Array<{
      adGroupResourceName: string
      finalUrl: string
      headlines: string[]
      descriptions: string[]
    }>
    loginCustomerId?: string
  },
): Promise<string[]> {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.100xcircle.com").replace(/\/$/, "")
  const ops = opts.ads.map(ad => ({
    adGroupAdOperation: {
      create: {
        adGroup: ad.adGroupResourceName,
        status: "PAUSED",
        ad: {
          finalUrls: [`${siteUrl}${ad.finalUrl}`],
          responsiveSearchAd: {
            headlines: ad.headlines.slice(0, 15).map(text => ({ text })),
            descriptions: ad.descriptions.slice(0, 4).map(text => ({ text })),
          },
        },
      },
    },
  }))
  const resp = await mutate(customerId, ops, accessToken, opts.loginCustomerId)
  return resp.mutateOperationResponses.map((r, i) => {
    const rn = r.adGroupAdResult?.resourceName
    if (!rn) throw new Error(`Ads mutate: no adGroupAd resourceName at index ${i}`)
    return rn
  })
}

// ── Rollback: remove entities in safe order ─────────────────────────────────
// ads → criteria → ad groups → campaign → budget

export async function removeDeployedEntities(
  customerId: string,
  accessToken: string,
  resourceNames: {
    ads: string[]
    adGroupCriteria: string[]
    campaignCriteria: string[]
    adGroups: string[]
    campaign?: string
    campaignBudget?: string
  },
  loginCustomerId?: string,
): Promise<void> {
  if (resourceNames.ads.length)
    await mutateRemove(customerId, resourceNames.ads, "adGroupAdOperation", accessToken, loginCustomerId)
  if (resourceNames.adGroupCriteria.length)
    await mutateRemove(customerId, resourceNames.adGroupCriteria, "adGroupCriterionOperation", accessToken, loginCustomerId)
  if (resourceNames.campaignCriteria.filter(Boolean).length)
    await mutateRemove(customerId, resourceNames.campaignCriteria.filter(Boolean), "campaignCriterionOperation", accessToken, loginCustomerId)
  if (resourceNames.adGroups.length)
    await mutateRemove(customerId, resourceNames.adGroups, "adGroupOperation", accessToken, loginCustomerId)
  if (resourceNames.campaign)
    await mutateRemove(customerId, [resourceNames.campaign], "campaignOperation", accessToken, loginCustomerId)
  if (resourceNames.campaignBudget)
    await mutateRemove(customerId, [resourceNames.campaignBudget], "campaignBudgetOperation", accessToken, loginCustomerId)
}

// ── Post-approval: enable campaign (HUMAN-ONLY path) ───────────────────────
// This function is ONLY called by the approval route after a human APPROVE click.

export async function enableCampaignPostApproval(
  customerId: string,
  accessToken: string,
  campaignResourceName: string,
  loginCustomerId?: string,
): Promise<void> {
  await mutate(
    customerId,
    [{
      campaignOperation: {
        update: {
          resourceName: campaignResourceName,
          status: "ENABLED",
        },
        updateMask: "status",
      },
    }],
    accessToken,
    loginCustomerId,
  )
}

// ── Developer token readiness check ────────────────────────────────────────

export function isDeveloperTokenReady(): boolean {
  return !!(process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "").trim()
}

export function getTokenReadinessStatus(): {
  configured: boolean
  note: string
} {
  const configured = isDeveloperTokenReady()
  return {
    configured,
    note: configured
      ? "Developer token is set. Test accounts work immediately. Real accounts require Basic Access approval from Google."
      : "GOOGLE_ADS_DEVELOPER_TOKEN is not set. Add it to Vercel environment variables.",
  }
}
