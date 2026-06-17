/**
 * Deployment Record — persistence and rollback for AI Media Buyer drafts.
 * Every campaign deployment writes a record here before any Google Ads API call.
 * Rollback reads from this record and removes entities in safe order.
 */

import clientPromise from "@/lib/mongodb"
import { removeDeployedEntities } from "@/lib/google-ads-mutate"
import { getValidAccessToken } from "@/lib/google-oauth"
import type { CampaignQualityScores } from "@/lib/growth-os/ads-quality-scoring"

export const COLL_DEPLOYMENTS   = "ads_deployments"
export const COLL_CAMPAIGN_PLANS = "ads_campaign_plans"

// ── Types ───────────────────────────────────────────────────────────────────

export type DeploymentStatus = "pending" | "approved" | "rolled_back" | "simulated"

export interface DeployedResourceNames {
  campaignBudget:          string
  campaign:                string
  adGroups:                string[]
  adGroupCriteria:         string[]
  campaignCriteria:        string[]
  ads:                     string[]
  sitelinkAssets?:         string[]
  sitelinkCampaignAssets?: string[]
  calloutAssets?:          string[]
  calloutCampaignAssets?:  string[]
}

export interface AdsDeployment {
  deploymentId:    string
  funnel:          "A" | "B" | "C"
  campaignPlanId:  string
  customerId:      string
  loginCustomerId?: string
  campaignName:    string
  resourceNames:   DeployedResourceNames
  state:           "draft" | "paused" | "enabled"
  status:          DeploymentStatus
  qualityScores:   CampaignQualityScores
  createdAt:       string
  updatedAt:       string
  approvedAt?:     string
  rolledBackAt?:   string
  rolledBackReason?: string
}

// ── Create ──────────────────────────────────────────────────────────────────

export async function createDeploymentRecord(opts: {
  funnel:          "A" | "B" | "C"
  campaignPlanId:  string
  customerId:      string
  loginCustomerId?: string
  campaignName:    string
  resourceNames:   DeployedResourceNames
  qualityScores:   CampaignQualityScores
  simulated?:      boolean
}): Promise<AdsDeployment> {
  const db = (await clientPromise).db()
  const now = new Date().toISOString()
  const deploymentId = `dep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  const doc: AdsDeployment = {
    deploymentId,
    funnel:          opts.funnel,
    campaignPlanId:  opts.campaignPlanId,
    customerId:      opts.customerId,
    loginCustomerId: opts.loginCustomerId,
    campaignName:    opts.campaignName,
    resourceNames:   opts.resourceNames,
    state:           "paused",
    status:          opts.simulated ? "simulated" : "pending",
    qualityScores:   opts.qualityScores,
    createdAt:       now,
    updatedAt:       now,
  }

  await db.collection(COLL_DEPLOYMENTS).insertOne(doc)
  return doc
}

// ── Load ────────────────────────────────────────────────────────────────────

export async function getDeployment(deploymentId: string): Promise<AdsDeployment | null> {
  const db = (await clientPromise).db()
  const doc = await db.collection(COLL_DEPLOYMENTS).findOne({ deploymentId })
  if (!doc) return null
  const { _id, ...rest } = doc
  return rest as AdsDeployment
}

// ── Update status ───────────────────────────────────────────────────────────

export async function updateDeploymentStatus(
  deploymentId: string,
  update: Partial<Pick<AdsDeployment, "status" | "state" | "approvedAt" | "rolledBackAt" | "rolledBackReason">>,
): Promise<void> {
  const db = (await clientPromise).db()
  await db.collection(COLL_DEPLOYMENTS).updateOne(
    { deploymentId },
    { $set: { ...update, updatedAt: new Date().toISOString() } },
  )
}

// ── Rollback ────────────────────────────────────────────────────────────────
// Removes entities in safe order via Google Ads mutate API.
// Safe failure mode: if a remove fails, campaign stays PAUSED (non-serving).

export async function rollbackDeployment(
  deploymentId: string,
  reason: string = "manual_reject",
): Promise<{ ok: boolean; error?: string }> {
  const deployment = await getDeployment(deploymentId)
  if (!deployment) return { ok: false, error: "Deployment not found" }

  if (deployment.status === "rolled_back") return { ok: true } // idempotent
  if (deployment.status === "simulated")  {
    await updateDeploymentStatus(deploymentId, {
      status: "rolled_back",
      rolledBackAt: new Date().toISOString(),
      rolledBackReason: reason,
    })
    return { ok: true }
  }

  try {
    const accessToken = await getValidAccessToken()
    await removeDeployedEntities(
      deployment.customerId,
      accessToken,
      {
        ads:                     deployment.resourceNames.ads,
        adGroupCriteria:         deployment.resourceNames.adGroupCriteria,
        campaignCriteria:        deployment.resourceNames.campaignCriteria,
        adGroups:                deployment.resourceNames.adGroups,
        campaign:                deployment.resourceNames.campaign,
        campaignBudget:          deployment.resourceNames.campaignBudget,
        sitelinkCampaignAssets:  deployment.resourceNames.sitelinkCampaignAssets,
        calloutCampaignAssets:   deployment.resourceNames.calloutCampaignAssets,
        sitelinkAssets:          deployment.resourceNames.sitelinkAssets,
        calloutAssets:           deployment.resourceNames.calloutAssets,
      },
      deployment.loginCustomerId,
    )

    await updateDeploymentStatus(deploymentId, {
      status:          "rolled_back",
      state:           "draft",
      rolledBackAt:    new Date().toISOString(),
      rolledBackReason: reason,
    })
    return { ok: true }
  } catch (err) {
    console.error("[AdsDeployment] rollback error:", String(err))
    return { ok: false, error: String(err) }
  }
}
