// Shared harness for step 3b tests: fresh scoped DB per test, injected fetch/uploader, deterministic clock.
import { ObjectId } from "mongodb"
import { crmDbFrom } from "../../../../lib/crm/db.ts"
import { readCrmEnv } from "../../../../lib/crm/env.ts"
import { handleWebhookPost } from "../../../../lib/crm/whatsapp/webhook.ts"
import { silentLogger } from "../../../../lib/crm/whatsapp/ingest.ts"
import { COLL } from "../../../../lib/crm/model.ts"
import { TEST_WA, testWaEnv, signedWebhookRequest, loadFixtureJson } from "./wa-sign.mjs"

let n = 0
export const T0 = 1760000000 // fixture message timestamp (seconds)
export const NOW = () => new Date((T0 + 500) * 1000)
export const env = (o) => readCrmEnv(testWaEnv(o))

export async function freshCrm(m) {
  const db = m.client.db(`crm_wa_${process.pid}_${++n}`)
  const crm = crmDbFrom(db, "fogging")
  const r = await crm.ensureIndexes()
  if (r.conflicts && r.conflicts.length) throw new Error("index conflicts " + JSON.stringify(r.conflicts))
  return crm
}

export const all = (crm, coll, f = {}) => crm.collection(coll).find(f).toArray()
export const count = (crm, coll, f = {}) => crm.collection(coll).countDocuments(f)

export const DL_URL = "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=SECRETMEDIAURL123&ext=999&hash=abcSECRET"

/** Mock Meta media: lookup JSON then bytes. Records every call. */
export function mockMedia({ bytes = Buffer.from("hello-bytes"), mime = "image/jpeg", fileSize, lookupStatus = 200, lookupBody, dlStatus = 200, throwOn, dlHeaders = {} } = {}) {
  const calls = []
  const fetch = async (url, init) => {
    calls.push({ url, init })
    const isLookup = url.startsWith("https://graph.facebook.com/")
    if (throwOn === (isLookup ? "lookup" : "download")) throw new Error("socket hang up " + url)
    if (isLookup) {
      if (lookupStatus !== 200) {
        const body = lookupBody ?? { error: { message: `bad ${DL_URL}`, type: "OAuthException", code: 100, fbtrace_id: "TRACE1" } }
        return new Response(JSON.stringify(body), { status: lookupStatus, headers: { "content-type": "application/json" } })
      }
      return new Response(JSON.stringify({ url: DL_URL, mime_type: mime, file_size: fileSize ?? bytes.length, id: "x" }), { status: 200, headers: { "content-type": "application/json" } })
    }
    if (dlStatus !== 200) return new Response("nope", { status: dlStatus })
    return new Response(bytes, { status: 200, headers: dlHeaders })
  }
  return { fetch, calls, DL_URL }
}

export function mockUploader({ fail = false } = {}) {
  const uploads = []
  const upload = async (input) => {
    uploads.push(input)
    if (fail) throw new Error("cloudinary down https://res.cloudinary.com/secret")
    return { url: `https://res.cloudinary.com/demo/${input.filename}`, publicId: null }
  }
  return { upload, uploads }
}

/**
 * POST a (raw string | object) webhook through handleWebhookPost and run the after() tasks inline.
 * opts.runAfter=false leaves the events pending.
 */
export async function post(crm, raw, opts = {}) {
  const tasks = []
  const media = opts.media ?? mockMedia()
  const up = opts.up ?? mockUploader()
  const req = signedWebhookRequest(raw, opts.sign)
  const res = await handleWebhookPost(req, {
    getDb: opts.getDb ?? (async () => crm),
    schedule: t => tasks.push(t),
    env: opts.env ?? env(),
    fetch: media.fetch,
    upload: up.upload,
    now: opts.now ?? NOW,
    logger: opts.logger === "default" ? undefined : (opts.logger ?? (() => silentLogger)),
    requestId: "req-test",
    afterInbound: opts.afterInbound,
  })
  if (opts.runAfter !== false) for (const t of tasks) await t()
  return { res, tasks, media, up }
}

/** Fixture clone with a new wamid / timestamp (for ordering and drain tests). */
export function variant(name, { wamid, ts } = {}) {
  const j = loadFixtureJson(name)
  const v = j.entry[0].changes[0].value
  if (v.messages) { if (wamid) v.messages[0].id = wamid; if (ts !== undefined) v.messages[0].timestamp = String(ts) }
  if (v.statuses) { if (wamid) v.statuses[0].id = wamid; if (ts !== undefined) v.statuses[0].timestamp = String(ts) }
  return j
}

export const ingestDeps = (o = {}) => ({ allowList: [TEST_WA.allowedPhoneNumberId], accessToken: TEST_WA.accessToken, apiVersion: "v23.0", now: NOW, ...o })

export async function seedOutbound(crm, { wamid = TEST_WA.outboundWamid, contactId = null, extra = {} } = {}) {
  const _id = new ObjectId()
  await crm.collection(COLL.messages).insertOne({
    _id, conversationId: new ObjectId(), contactId, phoneNumberId: TEST_WA.allowedPhoneNumberId, direction: "out", waMessageId: wamid,
    type: "text", status: "sent", statusRank: 1, statusAt: {}, createdAt: NOW(), ...extra,
  })
  return _id
}
