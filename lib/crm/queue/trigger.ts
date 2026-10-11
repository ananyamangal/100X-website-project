/**
 * POST /api/crm/queue/run (STEP 9; DATA_MODEL §5 driver 3): runs the chunk loop for one number and
 * re-invokes itself while due work remains.
 *
 * Auth (the route is exempt from the session middleware and checks for itself):
 *   - `x-crm-chunk-sig: <ts>.<depth>.<hex>` = HMAC-SHA256(CRON_SECRET, "<pnid>|<ts>|<depth>"), valid
 *     5 minutes, depth ≤ 50 — the self-continuation call; or
 *   - a CRM session with crm.broadcasts.send or crm.settings.edit — the admin trigger.
 * The response is 202 at once; the work runs in after() (inline when no scheduler is given: tests).
 * The self-call goes to CRM_PUBLIC_BASE_URL (never the Host header), waits ≤ 5 s for headers only,
 * and carries x-vercel-protection-bypass when VERCEL_AUTOMATION_BYPASS_SECRET is set (previews).
 * It stops when only cap-deferred work is left, or at depth 50.
 */
import { createHmac, timingSafeEqual } from "node:crypto"
import { crmError, crmJson, requestIdOf, requireCrm, can, crmApiLogger } from "../api/auth"
import { readCrmEnv } from "../env"
import { graphConfigFrom, type FetchLike } from "../outbound/graph"
import { readJsonObject } from "../validate"
import type { CrmApiDeps } from "../api/route"
import { runChunk, type ChunkResult } from "./chunk"

export const SIG_HEADER = "x-crm-chunk-sig"
export const SIG_TTL_MS = 5 * 60_000
export const MAX_DEPTH = 50

export function signChunk(secret: string, pnid: string, ts: number, depth: number): string {
  return `${ts}.${depth}.${createHmac("sha256", secret).update(`${pnid}|${ts}|${depth}`).digest("hex")}`
}

export function verifyChunkSig(header: string | null, secret: string | undefined, pnid: string, now: number): { ok: true; depth: number } | { ok: false } {
  if (!header || !secret) return { ok: false }
  const m = /^(\d{10,16})\.(\d{1,2})\.([a-f0-9]{64})$/.exec(header)
  if (!m) return { ok: false }
  const ts = Number(m[1]), depth = Number(m[2])
  if (depth > MAX_DEPTH || Math.abs(now - ts) > SIG_TTL_MS) return { ok: false }
  const expected = Buffer.from(signChunk(secret, pnid, ts, depth).split(".")[2], "hex")
  const got = Buffer.from(m[3], "hex")
  return expected.length === got.length && timingSafeEqual(expected, got) ? { ok: true, depth } : { ok: false }
}

export interface QueueDeps extends CrmApiDeps {
  /** Self-invocation transport (tests inject a recorder). Default: global fetch. */
  selfFetch?: FetchLike
  cronSecret?: string
  bypassSecret?: string
  sleep?: (ms: number) => Promise<void>
  budgetMs?: number
}

export async function selfInvoke(baseUrl: string, secret: string, pnid: string, depth: number, deps: { selfFetch?: FetchLike; bypassSecret?: string; now?: number }): Promise<boolean> {
  const url = `${baseUrl.replace(/\/+$/, "")}/api/crm/queue/run`
  const headers: Record<string, string> = { "content-type": "application/json", [SIG_HEADER]: signChunk(secret, pnid, deps.now ?? Date.now(), depth) }
  if (deps.bypassSecret) headers["x-vercel-protection-bypass"] = deps.bypassSecret
  try {
    const f = deps.selfFetch ?? ((u, i) => fetch(u, i))
    await f(url, { method: "POST", headers, body: JSON.stringify({ phoneNumberId: pnid }), signal: AbortSignal.timeout(5000) })
    return true
  } catch {
    return false // the next trigger (UI, resume) picks the work up
  }
}

export async function handleQueueRun(request: Request, deps: QueueDeps): Promise<Response> {
  const requestId = requestIdOf(request.headers)
  const log = crmApiLogger(requestId, "queue.run")
  const sig = request.headers.get(SIG_HEADER)
  // Without a chunk signature this is the admin trigger: authenticate before reading anything.
  if (!sig) {
    const auth = await requireCrm(request, [], requestId, deps.auth)
    if (!auth.ok) return auth.response
    if (!can(auth.actor, "crm.broadcasts.send") && !can(auth.actor, "crm.settings.edit")) {
      return crmError(403, "forbidden", requestId, { required: ["crm.broadcasts.send|crm.settings.edit"] })
    }
  }
  const env = deps.env ?? readCrmEnv()
  const secret = deps.cronSecret ?? process.env.CRON_SECRET?.trim() ?? undefined
  const body = (await readJsonObject(request, 4096)) ?? {}
  const asked = typeof body.phoneNumberId === "string" ? body.phoneNumberId : null
  const list = env.waPhoneNumberIds
  const pnid = asked ? (list.includes(asked) ? asked : null) : list.length === 1 ? list[0] : null
  if (!pnid) return sig ? crmError(401, "unauthorized", requestId) : crmError(400, "validation", requestId, { fields: { phoneNumberId: asked ? "not_allow_listed" : "required" } })
  let depth = 0
  if (sig) {
    const v = verifyChunkSig(sig, secret, pnid, Date.now())
    if (!v.ok) return crmError(401, "unauthorized", requestId)
    depth = v.depth
  }

  const work = () => runQueue(deps, pnid, depth, requestId)
  if (deps.schedule) {
    deps.schedule(async () => { await work() })
    return crmJson({ started: true, phoneNumberId: pnid, depth }, requestId, 202)
  }
  const r = await work()
  return crmJson({ started: true, phoneNumberId: pnid, depth, result: r }, requestId, 200)
}

/** One chunk run for `pnid`, then the signed self-continuation while due work remains. */
export async function runQueue(deps: QueueDeps, pnid: string, depth: number, requestId: string): Promise<ChunkResult | null> {
  const log = crmApiLogger(requestId, "queue.run")
  const env = deps.env ?? readCrmEnv()
  const secret = deps.cronSecret ?? process.env.CRON_SECRET?.trim() ?? undefined
  try {
    const crm = await deps.getDb()
    const r = await runChunk(crm, pnid, {
      allowList: env.waPhoneNumberIds, graph: graphConfigFrom(env, deps.fetch), accessToken: env.waAccessToken, apiVersion: env.waApiVersion, fetch: deps.fetch,
      requestId, now: deps.now, sleep: deps.sleep, budgetMs: deps.budgetMs,
    })
    log.info("chunk run", { depth, locked: r.locked, rounds: r.rounds, sent: r.recipients.sent, failed: r.recipients.failed, deferred: r.recipients.deferred, jobsDone: r.jobs.done, events: r.events, more: r.more, onlyDeferred: r.onlyDeferred })
    if (r.more && !r.onlyDeferred && depth < MAX_DEPTH && env.publicBaseUrl && secret) {
      await selfInvoke(env.publicBaseUrl, secret, pnid, depth + 1, { selfFetch: deps.selfFetch, bypassSecret: deps.bypassSecret ?? process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() })
    }
    return r
  } catch (e) {
    log.error("chunk run failed", { error: e instanceof Error ? e.name : "unknown" })
    return null
  }
}
