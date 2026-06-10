/**
 * Growth OS — Page Guidance Engine.
 *
 * Provides context-aware "What should I do now?" guidance for each admin page.
 * Every page gets:
 *   - A primary action (the most important thing to do right now)
 *   - Supporting actions (2–3 secondary steps)
 *   - A readiness indicator specific to that page
 *   - Explanation of what this page does and why it matters
 *
 * Designed for non-expert users — avoids technical jargon.
 */

import type { Db } from "mongodb"
import clientPromise from "@/lib/mongodb"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PageAction {
  label:      string         // short button label
  description: string        // one-sentence description
  url?:       string         // if navigating to another page
  apiEndpoint?: string       // if triggering an API call (POST URL)
  method?:    "GET" | "POST"
  impact:     "high" | "medium" | "low"
}

export interface PageGuidance {
  page:           string
  pageTitle:      string
  pageExplainer:  string     // what this page does in plain English
  readinessLabel: string     // e.g. "Ready to use", "Needs setup"
  readinessScore: number     // 0–100 for this page
  primaryAction:  PageAction
  supportingActions: PageAction[]
  tip?:           string     // contextual tip for this session
  generatedAt:    string
}

// ── Per-page guidance definitions ─────────────────────────────────────────────

type GuidanceFn = (db: Db) => Promise<PageGuidance>

const PAGE_GUIDES: Record<string, GuidanceFn> = {

  "approval-queue": async (db) => {
    const pending  = await db.collection("ads_approval_queue").countDocuments({ status: "pending" })
    const critical = await db.collection("ads_approval_queue").countDocuments({ status: "pending", priority: "critical" })
    const approved = await db.collection("ads_approval_queue").countDocuments({ status: "approved" })

    return {
      page:          "approval-queue",
      pageTitle:     "Approval Queue",
      pageExplainer: "Every recommendation Growth OS generates lands here first. You review, then approve or reject. Nothing happens until you approve it — no automatic spending, no automatic keyword changes.",
      readinessLabel: pending > 0 ? `${pending} item(s) need your review` : "Queue is empty",
      readinessScore: pending > 0 ? 60 : 100,
      primaryAction: pending > 0 ? {
        label:       critical > 0 ? `Review ${critical} critical item(s)` : `Review ${pending} pending item(s)`,
        description: "Look at each recommendation, read the rationale, and approve or reject.",
        impact:      "high",
      } : {
        label:       "Queue is clear",
        description: "No items need your review right now. Run a keyword intelligence scan to generate new recommendations.",
        url:         "/admin/growth/ads/keyword-intelligence",
        impact:      "low",
      },
      supportingActions: [
        {
          label:       "Run Lead Value Intelligence",
          description: "Refresh keyword rankings based on the most recent leads.",
          apiEndpoint: "/api/admin/growth/ads/lead-value-intelligence",
          method:      "POST",
          impact:      "medium",
        },
        ...(approved > 0 ? [{
          label:       `Apply ${approved} approved item(s)`,
          description: "Items you approved are waiting to be applied to Google Ads. Mark them as applied after actioning.",
          impact:      "high" as const,
        }] : []),
      ],
      tip: pending === 0
        ? "Growth OS generates new recommendations daily. Check back tomorrow morning."
        : `There are ${pending} items waiting. Each has a rationale, evidence, and expected impact — read these before approving.`,
      generatedAt: new Date().toISOString(),
    }
  },

  "keyword-intelligence": async (db) => {
    const latestRun = await db.collection("ads_keyword_intelligence")
      .findOne({}, { sort: { generatedAt: -1 }, projection: { totalCount: 1, generatedAt: 1, meetsSuccessCriterion: 1, validatorRejectionCount: 1 } })

    const runAge = latestRun?.generatedAt
      ? Math.floor((Date.now() - new Date(String(latestRun.generatedAt)).getTime()) / 3_600_000)
      : 999

    return {
      page:          "keyword-intelligence",
      pageTitle:     "Keyword Intelligence",
      pageExplainer: "This engine discovers which search queries your ideal buyers are using. It reads your leads, Google Search Console data, and Google Ads search terms to find patterns — then ranks keywords by business value, not just click volume.",
      readinessLabel: !latestRun ? "No run yet" : runAge > 48 ? "Stale — run a refresh" : `${latestRun.totalCount} keywords (${runAge}h ago)`,
      readinessScore: !latestRun ? 0 : runAge > 48 ? 40 : latestRun.meetsSuccessCriterion ? 90 : 60,
      primaryAction: {
        label:       latestRun ? "Refresh keyword intelligence" : "Run keyword intelligence",
        description: latestRun ? "Generate an updated keyword list using the latest lead and GSC data." : "Run for the first time to discover high-value keywords from your leads and search data.",
        apiEndpoint: "/api/admin/growth/ads/keyword-pipeline",
        method:      "POST",
        impact:      "high",
      },
      supportingActions: [
        {
          label:       "View keyword audit",
          description: `See which keywords were generated, rejected by the validator, and which are eligible. ${latestRun?.validatorRejectionCount ? `${latestRun.validatorRejectionCount} rejected in last run.` : ""}`,
          url:         "/admin/growth/ads/keyword-intelligence",
          impact:      "medium",
        },
        {
          label:       "Check campaign viability",
          description: "Verify the keyword set is large and diverse enough to run a viable campaign.",
          apiEndpoint: "/api/admin/growth/ads/keyword-pipeline",
          method:      "POST",
          impact:      "medium",
        },
      ],
      tip: latestRun?.validatorRejectionCount
        ? `Last run rejected ${latestRun.validatorRejectionCount} keywords for quality issues (questions, event content, no commercial signal). This is expected — the validator protects your campaign budget.`
        : "Keyword Intelligence reads from 12 sources: conversion signals, GSC, Google Ads search terms, GeM signals, and AI expansion. Conversion-backed keywords always get EXACT match.",
      generatedAt: new Date().toISOString(),
    }
  },

  "lead-value-intelligence": async (db) => {
    const latest = await db.collection("ads_lead_value_intelligence")
      .findOne({}, { sort: { generatedAt: -1 }, projection: { totalLeads: 1, totalWeightedScore: 1, topLeadType: 1, generatedAt: 1 } })

    return {
      page:          "lead-value-intelligence",
      pageTitle:     "Lead Value Intelligence",
      pageExplainer: "Not all leads are equal. A dealer application is worth much more than a brochure download. This module scores every lead using a formula: Lead Type Score × Opportunity Score × Business Fit Score — then ranks keywords, states, and landing pages by the value they generate, not the volume.",
      readinessLabel: !latest ? "No run yet" : `${latest.totalLeads} leads scored`,
      readinessScore: !latest ? 0 : 80,
      primaryAction: {
        label:       "Run Lead Value Intelligence",
        description: "Score all leads and update keyword rankings by business value.",
        apiEndpoint: "/api/admin/growth/ads/lead-value-intelligence",
        method:      "POST",
        impact:      "high",
      },
      supportingActions: [
        {
          label:       "Run State Intelligence",
          description: "See which states are generating the highest-value leads and get budget recommendations.",
          apiEndpoint: "/api/admin/growth/ads/state-intelligence",
          method:      "POST",
          impact:      "medium",
        },
        {
          label:       "Get budget recommendations",
          description: "Generate budget recommendations based on lead value and state performance.",
          apiEndpoint: "/api/admin/growth/ads/budget-recommendation-v2",
          method:      "POST",
          impact:      "high",
        },
      ],
      tip: latest
        ? `Top lead type: ${latest.topLeadType?.replace(/_/g, " ")} — ${latest.totalLeads} leads scored, total weighted score ${latest.totalWeightedScore}.`
        : "Run Lead Value Intelligence first, then State Intelligence, then Budget Recommendations V2 — they build on each other.",
      generatedAt: new Date().toISOString(),
    }
  },

  "state-intelligence": async (db) => {
    const latest = await db.collection("ads_state_intelligence")
      .findOne({}, { sort: { generatedAt: -1 }, projection: { topState: 1, statesAnalyzed: 1, untappedTier1: 1, generatedAt: 1 } })

    return {
      page:          "state-intelligence",
      pageTitle:     "State Intelligence",
      pageExplainer: "Different Indian states have very different demand for fogging machines and pest control equipment. State Intelligence maps your leads to states, identifies where you're winning (Kerala, Maharashtra) and where you should expand (states with zero leads but high government procurement).",
      readinessLabel: !latest ? "No run yet" : `${latest.statesAnalyzed} states analyzed`,
      readinessScore: !latest ? 0 : 85,
      primaryAction: {
        label:       latest ? "Refresh state analysis" : "Run state analysis",
        description: "Analyze which states are converting and generate geo-targeted recommendations.",
        apiEndpoint: "/api/admin/growth/ads/state-intelligence",
        method:      "POST",
        impact:      "high",
      },
      supportingActions: [
        {
          label:       "View state profiles",
          description: "See the full breakdown of each state: lead count, weighted score, top keywords, budget signal.",
          url:         "/admin/growth/ads/state-intelligence",
          impact:      "medium",
        },
      ],
      tip: latest?.untappedTier1?.length
        ? `${latest.untappedTier1.length} Tier 1 state(s) with zero leads: ${(latest.untappedTier1 as string[]).slice(0, 3).join(", ")}. These are high-opportunity expansion targets.`
        : "Tier 1 states (Kerala, Maharashtra, Karnataka, Tamil Nadu, Delhi, Gujarat) have the highest government health procurement spend.",
      generatedAt: new Date().toISOString(),
    }
  },

  "paid": async (db) => {
    const hasToken      = !!(process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "").trim()
    const settings      = await db.collection("ads_settings").findOne({})
    const deployments   = await db.collection("ads_deployments").countDocuments({})
    const pendingQueue  = await db.collection("ads_approval_queue").countDocuments({ status: "pending" })

    return {
      page:          "paid",
      pageTitle:     "Paid Ads",
      pageExplainer: "Control center for your Google Ads campaigns. Run the Campaign Factory to create new campaigns, review the keyword pipeline, check viability, and deploy to Google Ads — all with human approval at every step.",
      readinessLabel: !hasToken ? "Setup required" : deployments === 0 ? "Connected — no campaigns" : `${deployments} campaign(s)`,
      readinessScore: !hasToken ? 10 : deployments === 0 ? 50 : 85,
      primaryAction: !hasToken ? {
        label:       "Configure Google Ads API",
        description: "Add your Google Ads developer token and customer ID to get started.",
        url:         "/admin/growth/paid",
        impact:      "high",
      } : deployments === 0 ? {
        label:       "Run Campaign Factory V2",
        description: "Generate your first campaign draft using conversion signals and keyword intelligence.",
        apiEndpoint: "/api/admin/growth/ads/campaign-factory-v2",
        method:      "POST",
        impact:      "high",
      } : {
        label:       `Review ${pendingQueue} pending item(s)`,
        description: "Check the approval queue for keyword, budget, and campaign recommendations.",
        url:         "/admin/growth/ads/approval-queue",
        impact:      pendingQueue > 0 ? "high" : "low",
      },
      supportingActions: [
        {
          label:       "Check campaign viability",
          description: "Verify keyword set quality before deploying to Google Ads.",
          apiEndpoint: "/api/admin/growth/ads/keyword-pipeline",
          method:      "POST",
          impact:      "medium",
        },
        {
          label:       "View keyword pipeline",
          description: "See how many keywords were generated, rejected, and are eligible for deployment.",
          url:         "/admin/growth/ads/keyword-intelligence",
          impact:      "medium",
        },
      ],
      tip: pendingQueue > 0
        ? `${pendingQueue} recommendation(s) are waiting in the Approval Queue. These were generated by Growth OS and are ready for your review.`
        : "Growth OS never spends money automatically. Every campaign change requires your explicit approval in the Approval Queue.",
      generatedAt: new Date().toISOString(),
    }
  },

  "dashboard": async (db) => {
    const leads    = await db.collection("rfq_popup_leads").countDocuments({})
    const queue    = await db.collection("ads_approval_queue").countDocuments({ status: "pending" })
    const opps     = await db.collection("growth_opportunities").countDocuments({ status: "pending" })
    const dealers  = await db.collection("rfq_popup_leads")
      .countDocuments({ leadType: { $in: ["dealer_application", "oem_authorization"] } })

    return {
      page:          "dashboard",
      pageTitle:     "Growth Dashboard",
      pageExplainer: "Overview of your Growth OS activity. Shows lead pipeline, agent activity, and pending actions. For a simplified daily view, use Founder Mode.",
      readinessLabel: "Overview",
      readinessScore: 80,
      primaryAction: queue > 0 ? {
        label:       `Review ${queue} queued recommendation(s)`,
        description: "Your most urgent action: Growth OS has recommendations waiting for review.",
        url:         "/admin/growth/ads/approval-queue",
        impact:      "high",
      } : {
        label:       "Run Lead Value Intelligence",
        description: "Score your leads and refresh keyword rankings.",
        apiEndpoint: "/api/admin/growth/ads/lead-value-intelligence",
        method:      "POST",
        impact:      "medium",
      },
      supportingActions: [
        {
          label:       `${leads} leads, ${dealers} high-value`,
          description: "View lead analytics and qualification status.",
          url:         "/admin/growth/leads",
          impact:      "high",
        },
        {
          label:       `${opps} opportunities`,
          description: "Review identified business opportunities.",
          url:         "/admin/growth/opportunities",
          impact:      "medium",
        },
      ],
      tip: "Use Founder Mode for a daily action summary without the technical detail.",
      generatedAt: new Date().toISOString(),
    }
  },
}

// ── Main ──────────────────────────────────────────────────────────────────────

export async function getPageGuidance(page: string): Promise<PageGuidance> {
  const client  = await clientPromise
  const db      = client.db() as Db
  const guideFn = PAGE_GUIDES[page]

  if (guideFn) return guideFn(db)

  // Default guidance for unknown pages
  return {
    page,
    pageTitle:     page.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    pageExplainer: "This page is part of Growth OS — the intelligence layer for your Google Ads and lead generation.",
    readinessLabel: "Ready",
    readinessScore: 70,
    primaryAction: {
      label:       "Go to the approval queue",
      description: "Check for pending recommendations that need your review.",
      url:         "/admin/growth/ads/approval-queue",
      impact:      "high",
    },
    supportingActions: [],
    generatedAt: new Date().toISOString(),
  }
}
