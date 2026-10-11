// Shared helpers for the STEP 5 outbound/opt-out/inbox/templates tests. No real DB, no real Meta:
// the Graph `fetch` is always an injected recorder; secrets are obviously fake (wa-sign TEST_WA).
import { ObjectId } from "mongodb"
import { COLL } from "../../../../lib/crm/model.ts"
import { graphConfigFrom } from "../../../../lib/crm/outbound/graph.ts"
import { fromComposer } from "../../../../lib/crm/outbound/compose.ts"
import { TEST_WA, loadFixture } from "./wa-sign.mjs"

export const PNID = TEST_WA.allowedPhoneNumberId
export const NOW = new Date("2026-10-10T10:00:00.000Z")
export const NOWF = () => NOW
export const H = 3600_000
export const MIN = 60_000
export const PHONE = "+919800000001"
export const WAID = "919800000001"
export const ago = (ms, from = NOW) => new Date(from.getTime() - ms)
export const out = s => {
  const r = fromComposer(s)
  if (!r.ok) throw new Error("fromComposer " + r.reason)
  return r.text
}

// Meta returns a fresh wamid per accepted message; the fake must too, or two sends in one test DB
// collide on the u_wamid unique index. Counter is module-wide so separate fakes never share an id.
let wamidN = 0
const uniqueWamid = body => {
  const ids = body?.messages
  if (!Array.isArray(ids) || ids.length !== 1 || ids[0]?.id !== "wamid.TEST_SENT_0001") return body
  return { ...body, messages: [{ ...ids[0], id: `wamid.TEST_SENT_${String(++wamidN).padStart(6, "0")}` }] }
}

/** Recording Graph fetch. `plan` = array of {status, body}|Error|fn consumed in order (last repeats); default = success fixture.
 *  Success bodies carrying the fixture wamid get a unique id per call; `f.wamids` lists the ids handed out. */
export function graphFetch(plan = []) {
  const calls = []
  const wamids = []
  let i = 0
  const f = async (url, init) => {
    const raw = init && init.body
    // JSON bodies are parsed; multipart uploads (FormData) are kept as entries.
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw instanceof FormData ? Object.fromEntries(raw.entries()) : null
    calls.push({ url, init, body: parsed })
    const step = plan.length ? plan[Math.min(i++, plan.length - 1)] : { status: 200, body: JSON.parse(loadFixture("graph-send-success")) }
    const s = typeof step === "function" ? await step(calls[calls.length - 1]) : step
    if (s instanceof Error) throw s
    const body = s.status >= 200 && s.status < 300 ? uniqueWamid(s.body) : s.body
    if (body?.messages?.[0]?.id) wamids.push(body.messages[0].id)
    return new Response(JSON.stringify(body), { status: s.status, headers: { "content-type": "application/json" } })
  }
  f.calls = calls
  f.wamids = wamids
  return f
}
export const fx = name => JSON.parse(loadFixture(name))
export const errStep = (name, status = 400) => ({ status, body: fx(name) })
export const timeoutErr = () => Object.assign(new Error("The operation was aborted due to timeout"), { name: "TimeoutError" })

export const cfgOf = fetch => graphConfigFrom({ waAccessToken: TEST_WA.accessToken, waApiVersion: "v23.0" }, fetch)

export function sendDeps(fetch, o = {}) {
  return { allowList: [PNID], graph: fetch === null ? null : cfgOf(fetch), requestId: "req-out-1", now: NOWF, ...o }
}

let phoneN = 0
export async function seedContact(crm, o = {}) {
  const n = ++phoneN
  const phoneE164 = o.phoneE164 ?? `+9198000${String(10000 + n).padStart(5, "0")}`
  const _id = new ObjectId()
  await crm.collection(COLL.contacts).insertOne({
    _id, phoneE164, waId: phoneE164.slice(1), notOnWhatsApp: null, phoneKind: "mobile", altPhones: [], name: o.name ?? `Customer ${n}`,
    waProfileName: null, company: null, customerType: null, state: null, city: null, email: null, language: "en_US", interestTags: [],
    suggestions: [], existingDealer: null, assignedTo: o.assignedTo ?? null, marketingOptOut: o.marketingOptOut ?? null,
    amcDueAt: null, lastActivityAt: o.lastActivityAt ?? NOW, origin: { channel: "whatsapp" }, mergedInto: null, createdBy: { system: "webhook" },
    createdAt: NOW, updatedAt: NOW, ...(o.extra ?? {}),
  })
  return { _id, phoneE164, waId: phoneE164.slice(1) }
}

export async function seedConv(crm, contact, o = {}) {
  const _id = o._id ?? new ObjectId()
  const lastInboundAt = o.lastInboundAt === undefined ? ago(1 * H) : o.lastInboundAt
  await crm.collection(COLL.conversations).insertOne({
    _id, contactId: contact._id, phoneNumberId: o.phoneNumberId ?? PNID, waId: contact.waId, status: o.status ?? "open",
    hasUnread: o.hasUnread ?? false, unreadCount: o.unreadCount ?? 0, lastMessageAt: o.lastMessageAt ?? lastInboundAt ?? NOW,
    lastInboundAt, lastOutboundAt: null, lastMessagePreview: o.preview ?? "hi", assignedTo: o.assignedTo ?? null, stage: o.stage ?? null,
    autoAckSentAt: null, lastAutoReplyAt: null, resolvedAt: null, resolvedBy: null, handler: "human", flow: null,
    createdAt: o.createdAt ?? NOW, updatedAt: o.updatedAt ?? o.lastMessageAt ?? NOW,
  })
  return _id
}

export async function seedTemplate(crm, o = {}) {
  const t = {
    name: "fog_t", language: "en_US", status: "APPROVED", category: "UTILITY", parameterFormat: "POSITIONAL", bodyText: "Hello {{1}}",
    bodyParamCount: 1, headerType: "NONE", headerParamCount: 0, hasOptOutButton: false, components: [], removedFromMeta: false, syncedAt: NOW, ...o,
  }
  await crm.collection(COLL.waTemplates).insertOne(t)
  return t
}

export const reqCtx = (id = "a".repeat(24)) => ({ params: Promise.resolve({ id: String(id) }) })
export const jreq = (method, url, body, headers = {}) =>
  new Request(url, { method, headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...headers }, body: body !== undefined ? JSON.stringify(body) : undefined })

export const ALL_INBOX = ["crm.view", "crm.inbox.view", "crm.inbox.reply", "crm.leads.view_all", "crm.leads.assign", "crm.settings.edit"]
export const user = (sub = "u1", name = "Asha") => ({ sub, name, role: "sales" })
export function apiDeps(crm, o = {}) {
  const { perms = ALL_INBOX, sub = "u1", fetch, env, ...rest } = o
  return {
    getDb: async () => crm,
    auth: { getUser: async () => (o.noUser ? null : user(sub)), resolvePermissions: async () => perms },
    assignable: async () => [{ id: "u1", name: "Asha" }, { id: "u2", name: "Ravi" }],
    now: NOWF,
    env: env ?? { waPhoneNumberIds: [PNID], waAccessToken: TEST_WA.accessToken, waApiVersion: "v23.0", waWabaId: TEST_WA.wabaId },
    fetch,
    ...rest,
  }
}

/** Capture console output for the duration of fn(); returns {lines, text}. */
export async function captureConsole(fn) {
  const lines = []
  const saved = {}
  for (const k of ["log", "info", "warn", "error", "debug"]) {
    saved[k] = console[k]
    console[k] = (...a) => lines.push(a.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join(" "))
  }
  try {
    await fn()
  } finally {
    for (const k of Object.keys(saved)) console[k] = saved[k]
  }
  return { lines, text: lines.join("\n") }
}
