/**
 * Server-side approval token management for GeM enrichment operations.
 *
 * Security model:
 *   - Tokens are single-use and time-limited (default 15 min).
 *   - Each token is scoped to one operation type.
 *   - verifyAndConsumeToken() is atomic via findOneAndUpdate — concurrent
 *     requests cannot both consume the same token.
 *   - Tokens are tied to the issuing user; a different user cannot consume them.
 *
 * MongoDB collection: gem_enrichment_approvals
 * Recommended TTL index (run once in Atlas):
 *   db.gem_enrichment_approvals.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })
 */

import { randomUUID } from "crypto"
import clientPromise from "@/lib/mongodb"
import type { JWTPayload } from "@/lib/rbac/types"

export const APPROVAL_PHRASE = "I APPROVE THIS ENRICHMENT RUN" as const

export type ApprovalOperation =
  | "harvest_scan"
  | "batch_fetch"
  | "batch_parse_save"
  | "enrich_pending"
  | "archive_write"

export interface ApprovalRecord {
  token_id:               string
  status:                 "active" | "consumed" | "expired"
  issued_to_user_id:      string
  issued_to_email:        string
  issued_to_session_id:   string | null
  approval_phrase:        string
  operation:              ApprovalOperation
  ip:                     string
  user_agent:             string
  issued_at:              Date
  expires_at:             Date
  consumed_at:            Date | null
  consumed_by_route:      string | null
}

const TTL_SECONDS = parseInt(process.env.ENRICHMENT_APPROVAL_TTL_SECONDS ?? "900", 10)
const COLLECTION   = "gem_enrichment_approvals"

export async function issueApprovalToken(
  user:      JWTPayload,
  operation: ApprovalOperation,
  ip:        string,
  userAgent: string,
): Promise<{ token_id: string; expires_at: Date; ttl_seconds: number }> {
  const now        = new Date()
  const expires_at = new Date(now.getTime() + TTL_SECONDS * 1000)
  const token_id   = randomUUID()

  const record: ApprovalRecord = {
    token_id,
    status:               "active",
    issued_to_user_id:    user.sub,
    issued_to_email:      user.email,
    issued_to_session_id: user.sessionId ?? null,
    approval_phrase:      APPROVAL_PHRASE,
    operation,
    ip,
    user_agent:           userAgent,
    issued_at:            now,
    expires_at,
    consumed_at:          null,
    consumed_by_route:    null,
  }

  const db = (await clientPromise).db()
  await db.collection(COLLECTION).insertOne(record)

  return { token_id, expires_at, ttl_seconds: TTL_SECONDS }
}

/**
 * Atomically verify and consume a token.
 * Returns the approval record on success, null if invalid/expired/wrong operation/already consumed.
 * A null return MUST be treated as a rejection — do not proceed with the operation.
 */
export async function verifyAndConsumeToken(
  token_id:         string,
  expected_user_id: string,
  operation:        ApprovalOperation,
  consuming_route:  string,
): Promise<ApprovalRecord | null> {
  if (!token_id || !expected_user_id) return null

  const now = new Date()
  const db  = (await clientPromise).db()

  const doc = await db.collection<ApprovalRecord>(COLLECTION).findOneAndUpdate(
    {
      token_id,
      issued_to_user_id: expected_user_id,
      operation,
      status:     "active",
      expires_at: { $gt: now },
    },
    {
      $set: {
        status:            "consumed",
        consumed_at:       now,
        consumed_by_route: consuming_route,
      },
    },
    { returnDocument: "after" },
  )

  return doc ?? null
}

export async function getApprovalRecord(token_id: string): Promise<ApprovalRecord | null> {
  const db  = (await clientPromise).db()
  const doc = await db.collection<ApprovalRecord>(COLLECTION).findOne({ token_id })
  return (doc as ApprovalRecord | null)
}
