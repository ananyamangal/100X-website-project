/**
 * Growth OS — Daily Optimization Loop.
 *
 * Orchestrates the full daily intelligence cycle:
 *
 *   Observe → Analyze → Recommend → Queue
 *
 * Run order:
 *   1. Expire stale approval queue items (housekeeping)
 *   2. Run Conversion Intelligence (which keywords/pages/states convert)
 *   3. Run Auto-Negative Engine (detect low-quality queries)
 *   4. Run Budget Allocation Engine (detect waste and scaling opportunities)
 *   5. Log the full run summary
 *
 * GOVERNANCE (permanent, non-negotiable):
 *   - This loop NEVER applies changes automatically
 *   - This loop NEVER modifies campaign settings
 *   - This loop NEVER spends money
 *   - Every output goes to the Approval Queue as "pending"
 *   - Human approval is required before anything is actioned
 *
 * Trigger: POST /api/admin/growth/ads/optimize
 * Schedule: Call once daily, preferably early morning before checking campaigns
 */

import clientPromise from "@/lib/mongodb"
import { expireStalePendingItems, getQueueSummary } from "@/lib/growth-os/approval-queue"
import { runConversionIntelligence, type ConversionIntelligenceRun } from "@/lib/growth-os/conversion-intelligence"
import { runAutoNegativeEngine, type AutoNegativeRun } from "@/lib/growth-os/auto-negative-engine"
import { runBudgetAllocationEngine, type BudgetAllocationRun } from "@/lib/growth-os/budget-allocation-engine"

// ── Types ────────────────────────────────────────────────────────────────────

export interface OptimizationLoopRun {
  runId:            string
  triggeredBy:      string   // "manual" | "cron" | "api"
  startedAt:        string
  completedAt:      string
  durationMs:       number
  steps: {
    expiredItems:       number
    conversionIntelligence: { success: boolean; leads: number; recommendations: number; error?: string }
    autoNegative:           { success: boolean; detected: number; pushed: number;         error?: string }
    budgetAllocation:       { success: boolean; adGroups: number; recommendations: number; error?: string }
  }
  queueSummaryAfter: { pending: number; approved: number; applied: number }
  governanceNote:    string
}

export const OPTIMIZATION_LOOP_COLL = "ads_optimization_loop_runs"

// ── Main ──────────────────────────────────────────────────────────────────────

export async function runOptimizationLoop(
  opts: { triggeredBy?: string } = {},
): Promise<OptimizationLoopRun> {
  const triggeredBy = opts.triggeredBy ?? "api"
  const startedAt   = new Date()

  const client = await clientPromise
  const db     = client.db()

  const steps: OptimizationLoopRun["steps"] = {
    expiredItems:           0,
    conversionIntelligence: { success: false, leads: 0, recommendations: 0 },
    autoNegative:           { success: false, detected: 0, pushed: 0 },
    budgetAllocation:       { success: false, adGroups: 0, recommendations: 0 },
  }

  // ── Step 1: Expire stale pending items ────────────────────────────────────
  try {
    steps.expiredItems = await expireStalePendingItems(db)
  } catch {
    steps.expiredItems = 0
  }

  // ── Step 2: Conversion Intelligence ──────────────────────────────────────
  let ciRun: ConversionIntelligenceRun | null = null
  try {
    ciRun = await runConversionIntelligence({ periodDays: 30, pushRecommendations: true })
    steps.conversionIntelligence = {
      success:         true,
      leads:           ciRun.totalLeads,
      recommendations: ciRun.recommendationsCount,
    }
  } catch (err) {
    steps.conversionIntelligence = {
      success:         false,
      leads:           0,
      recommendations: 0,
      error:           String(err),
    }
  }

  // ── Step 3: Auto-Negative Engine ──────────────────────────────────────────
  let aneRun: AutoNegativeRun | null = null
  try {
    aneRun = await runAutoNegativeEngine({ minImpressions: 5, minConfidence: 80, pushToQueue: true })
    steps.autoNegative = {
      success:  true,
      detected: aneRun.detectedCount,
      pushed:   aneRun.pushedToQueue,
    }
  } catch (err) {
    steps.autoNegative = {
      success:  false,
      detected: 0,
      pushed:   0,
      error:    String(err),
    }
  }

  // ── Step 4: Budget Allocation Engine ──────────────────────────────────────
  let baeRun: BudgetAllocationRun | null = null
  try {
    baeRun = await runBudgetAllocationEngine({ dataWindowDays: 14, pushToQueue: true })
    steps.budgetAllocation = {
      success:         true,
      adGroups:        baeRun.adGroupsAnalyzed,
      recommendations: baeRun.recommendationsCount,
    }
  } catch (err) {
    steps.budgetAllocation = {
      success:         false,
      adGroups:        0,
      recommendations: 0,
      error:           String(err),
    }
  }

  // ── Step 5: Queue summary snapshot ────────────────────────────────────────
  const summary = await getQueueSummary(db).catch(() => ({ pending: 0, approved: 0, applied: 0, rejected: 0, expired: 0, byType: {} }))

  const completedAt = new Date()
  const runId       = `opt_${startedAt.getTime()}_${Math.random().toString(36).slice(2, 6)}`

  const run: OptimizationLoopRun = {
    runId,
    triggeredBy,
    startedAt:  startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - startedAt.getTime(),
    steps,
    queueSummaryAfter: {
      pending:  summary.pending,
      approved: summary.approved,
      applied:  summary.applied,
    },
    governanceNote: "All recommendations require human approval before action. No automatic changes were made.",
  }

  await db.collection(OPTIMIZATION_LOOP_COLL).insertOne({ ...run })
  return run
}
