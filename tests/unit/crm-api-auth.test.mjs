// Run: node --import ./tests/support/register.mjs --test tests/unit/crm-api-auth.test.mjs
// Independent tests (3d/3e): /api/crm/* auth gate, permission registry, role mapping, lead scope.
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { startMemoryMongo } from "./crm/helpers/memory-mongo.mjs"
import { freshCrm } from "./crm/helpers/wa-harness.mjs"
import { CRM_PERMISSIONS, CRM_ROLE_MAPPING, COLL } from "../../lib/crm/model.ts"
import { PERMISSION_REGISTRY, MODULE_PERMISSIONS } from "../../lib/rbac/permissions.ts"
import { ROLE_PERMISSIONS, CRM_SALES_PERMISSIONS } from "../../lib/rbac/roles.ts"
import { requireCrm, leadScopeOf } from "../../lib/crm/api/auth.ts"
import { listLeadsHandler, createLeadHandler } from "../../lib/crm/api/leads.ts"
import { teamHandler } from "../../lib/crm/api/team.ts"
import { contactDetailHandler, contactTimelineHandler, patchDealHandler } from "../../lib/crm/api/contacts.ts"
import { listNotesHandler, createNoteHandler } from "../../lib/crm/api/notes.ts"
import { listDealersHandler, importPreviewHandler, importConfirmHandler } from "../../lib/crm/api/dealers.ts"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
let m
before(async () => { m = await startMemoryMongo() })
after(async () => { if (m) await m.stop() })

const OID = "a".repeat(24)
const req = (method = "GET", url = "http://x/api/crm/x", body) =>
  new Request(url, { method, headers: body ? { "content-type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined })
const ctx = { params: Promise.resolve({ id: OID }) }
const mkDeps = (user, perms, extra = {}) => ({
  getDb: extra.getDb ?? (async () => { throw new Error("DB must not be reached") }),
  auth: { getUser: async () => user, resolvePermissions: async () => perms },
  assignable: async () => [],
  ...extra,
})
const U = (role, sub = "u1") => ({ sub, name: "Tester", role })

const ROUTES = [
  ["GET leads", listLeadsHandler, "GET"],
  ["POST leads", createLeadHandler, "POST", { mobile: "9876543210", leadSource: "call" }],
  ["GET team", teamHandler, "GET"],
  ["GET contact", contactDetailHandler, "GET"],
  ["GET timeline", contactTimelineHandler, "GET"],
  ["PATCH deal", patchDealHandler, "PATCH", { nextFollowUpAt: null }],
  ["GET notes", listNotesHandler, "GET"],
  ["POST notes", createNoteHandler, "POST", { text: "x" }],
  ["GET dealers", listDealersHandler, "GET"],
  ["POST preview", importPreviewHandler, "POST", { text: "mobile\n9876543210" }],
  ["POST confirm", importConfirmHandler, "POST", { importId: OID }],
]

test("401 when there is no session, on every handler; x-request-id + no-store on the response", async () => {
  for (const [name, h, method, body] of ROUTES) {
    const res = await h(req(method, undefined, body), ctx, mkDeps(null, []))
    assert.equal(res.status, 401, name)
    assert.deepEqual(await res.json(), { error: "unauthorized" }, name)
    assert.ok(res.headers.get("x-request-id"), name)
    assert.equal(res.headers.get("cache-control"), "no-store", name)
  }
  const res = await listLeadsHandler(req(), ctx, { getDb: async () => { throw new Error("no") }, auth: { getUser: async () => { throw new Error("boom") }, resolvePermissions: async () => [] } })
  assert.equal(res.status, 401)
})

test("503 permissions_unavailable when the permission DB check throws (fail closed, never the JWT list)", async () => {
  const deps = { getDb: async () => { throw new Error("nope") }, auth: { getUser: async () => U("super_admin"), resolvePermissions: async () => { throw new Error("db down") } } }
  const orig = console.error
  console.error = () => {}
  try {
    for (const [name, h, method, body] of ROUTES) {
      const res = await h(req(method, undefined, body), ctx, deps)
      assert.equal(res.status, 503, name)
      assert.deepEqual(await res.json(), { error: "permissions_unavailable" }, name)
    }
  } finally { console.error = orig }
})

test("403 lists the missing keys; required keys per route", async () => {
  const need = {
    "POST leads": ["crm.view", "crm.leads.create"],
    "GET notes": ["crm.view", "crm.notes.view"],
    "POST notes": ["crm.view", "crm.notes.create"],
    "POST preview": ["crm.view", "crm.import.run"],
    "POST confirm": ["crm.view", "crm.import.run"],
  }
  for (const [name, h, method, body] of ROUTES) {
    const res = await h(req(method, undefined, body), ctx, mkDeps(U("viewer"), []))
    assert.equal(res.status, 403, name)
    const j = await res.json()
    assert.equal(j.error, "forbidden")
    assert.ok(Array.isArray(j.required) && j.required.includes("crm.view"), name)
    if (need[name]) assert.deepEqual(j.required, need[name], name)
  }
  const res = await createLeadHandler(req("POST", undefined, { mobile: "9876543210", leadSource: "call" }), ctx, mkDeps(U("x"), ["crm.view"]))
  assert.equal(res.status, 403)
  assert.deepEqual((await res.json()).required, ["crm.leads.create"])
  const r2 = await createLeadHandler(req("POST", undefined, { mobile: "9876543210", leadSource: "call" }), ctx, mkDeps(U("x"), ["crm.leads.create"]))
  assert.equal(r2.status, 403)
  assert.deepEqual((await r2.json()).required, ["crm.view"])
  assert.equal((await listLeadsHandler(req(), ctx, mkDeps(U("x"), ["crm.view"]))).status, 403)
  assert.equal((await contactDetailHandler(req(), ctx, mkDeps(U("x"), ["crm.view"]))).status, 403)
})

test("restricted roles (code fallback) get 403 on every /api/crm handler; non-crm roles hold no crm.* key", async () => {
  for (const role of ["seo_team", "content_team", "viewer", "procurement_analyst", "growth_admin"]) {
    const perms = ROLE_PERMISSIONS[role]
    assert.ok(!perms.some(p => p.startsWith("crm.")), `${role} must hold no crm.* key`)
    for (const [name, h, method, body] of ROUTES) {
      const res = await h(req(method, undefined, body), ctx, mkDeps(U(role), perms))
      assert.equal(res.status, 403, `${role} ${name}`)
    }
  }
})

test("route files: default deps with no session cookie -> 401 on every route export (no DB reached)", async () => {
  const saved = process.env.MONGODB_URI
  delete process.env.MONGODB_URI
  // Every session-protected route file under app/api/crm, discovered (a new route can never be
  // forgotten here). Excluded: the WhatsApp webhook (Meta signature) and /health (Bearer CRON_SECRET),
  // which have their own auth tests.
  const EXCLUDED = new Set(["app/api/crm/whatsapp/webhook/route.ts", "app/api/crm/health/route.ts"])
  const walk = d => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(`${d}/${e.name}`) : e.name === "route.ts" ? [`${d}/${e.name}`] : []))
  const discovered = walk("app/api/crm").filter(f => !EXCLUDED.has(f)).sort()
  assert.ok(discovered.length >= 25, `found ${discovered.length} route files`)
  for (const must of ["app/api/crm/leads/route.ts", "app/api/crm/inbox/summary/route.ts", "app/api/crm/quotations/[id]/issue/route.ts"]) assert.ok(discovered.includes(must), must)
  const files = []
  for (const f of discovered) {
    const mod = await import(pathToFileURL(path.join(ROOT, f)).href)
    files.push([f, ["GET", "POST", "PUT", "PATCH", "DELETE"].filter(m => typeof mod[m] === "function")])
  }
  try {
    for (const [f, methods] of files) {
      const mod = await import(pathToFileURL(path.join(ROOT, f)).href)
      assert.equal(mod.dynamic, "force-dynamic", f)
      assert.equal(mod.runtime, "nodejs", f)
      for (const meth of methods) {
        const res = await mod[meth](req(meth, "http://x/api/crm/x", meth === "GET" ? undefined : { a: 1 }), ctx)
        assert.equal(res.status, 401, `${meth} ${f}`)
      }
    }
  } finally { if (saved !== undefined) process.env.MONGODB_URI = saved }
})

test("registry: model CRM_PERMISSIONS and lib/rbac crm.* keys are the same set; rows well formed", () => {
  const reg = PERMISSION_REGISTRY.filter(p => p.key.startsWith("crm.")).map(p => p.key)
  assert.equal(new Set(reg).size, reg.length, "no duplicate registry keys")
  assert.deepEqual([...reg].sort(), [...CRM_PERMISSIONS].sort())
  assert.equal(CRM_PERMISSIONS.length, 23)
  const sortOrders = PERMISSION_REGISTRY.map(p => p.sortOrder)
  assert.equal(new Set(sortOrders).size, sortOrders.length, "sortOrder unique across registry")
  for (const p of PERMISSION_REGISTRY.filter(p => p.key.startsWith("crm."))) {
    assert.equal(p.group, "Dealer & CRM"); assert.equal(p.module, "crm"); assert.ok(p.label && p.description)
  }
  const crit = new Set(PERMISSION_REGISTRY.filter(p => p.key.startsWith("crm.") && p.critical).map(p => p.key))
  for (const k of ["crm.broadcasts.send", "crm.growth.export"]) assert.ok(crit.has(k), k)
  assert.equal(MODULE_PERMISSIONS["/admin/crm"], "crm.view")
  for (const k of ["leads.view_all", "leads.view_assigned", "dealers.view_all", "dealer.view"]) assert.ok(PERMISSION_REGISTRY.some(p => p.key === k), "legacy " + k)
})

test("role fallback mapping matches DATA_MODEL: owner all, sales_manager Sales+view_all, sales_executive Sales+view_assigned", () => {
  const crmOf = r => ROLE_PERMISSIONS[r].filter(p => p.startsWith("crm."))
  assert.deepEqual([...crmOf("super_admin")].sort(), [...CRM_PERMISSIONS].sort())
  const sales = CRM_ROLE_MAPPING.sales.permissions.filter(p => p !== "crm.leads.view_assigned")
  assert.deepEqual([...CRM_SALES_PERMISSIONS].sort(), [...sales].sort())
  assert.deepEqual([...crmOf("sales_manager")].sort(), [...sales, "crm.leads.view_all"].sort())
  assert.deepEqual([...crmOf("sales_executive")].sort(), [...sales, "crm.leads.view_assigned"].sort())
  assert.ok(!crmOf("sales_executive").includes("crm.leads.assign"))
  assert.ok(!crmOf("sales_manager").includes("crm.import.run"))
  for (const r of ["growth_admin", "seo_team", "procurement_analyst", "content_team", "viewer"]) assert.deepEqual(crmOf(r), [], r)
  assert.ok(!("operations" in ROLE_PERMISSIONS), "operations role not created (pending owner)")
  for (const r of Object.keys(ROLE_PERMISSIONS)) { const c = crmOf(r); assert.equal(new Set(c).size, c.length, r) }
})

test("leadScopeOf + requireCrm: super_admin passes every gate; view_all / assigned / none", async () => {
  for (const [name, h, method, body] of ROUTES) {
    const orig = console.error
    console.error = () => {}
    let res
    try { res = await h(req(method, undefined, body), ctx, mkDeps(U("super_admin"), ROLE_PERMISSIONS.super_admin, { getDb: async () => { throw new Error("stop") } })) } finally { console.error = orig }
    assert.ok(![401, 403, 503].includes(res.status), `${name} got ${res.status}`)
  }
  const rq = perms => requireCrm(req(), [], "rid", { getUser: async () => U("x", "u9"), resolvePermissions: async () => perms })
  assert.deepEqual(leadScopeOf((await rq(["crm.view", "crm.leads.view_assigned"])).actor), { kind: "assigned", userId: "u9" })
  assert.deepEqual(leadScopeOf((await rq(["crm.view", "crm.leads.view_assigned", "crm.leads.view_all"])).actor), { kind: "all" })
  assert.deepEqual(leadScopeOf((await rq(["crm.view"])).actor), { kind: "none" })
})

test("sales_executive sees only assigned leads: list filtered, foreign contact/timeline/notes/deal -> 404", async t => {
  if (!m.ok) return t.skip(m.skip)
  const crm = await freshCrm(m)
  const me = { userId: "exec1", name: "Exec One" }
  const other = { userId: "exec2", name: "Exec Two" }
  const now = new Date()
  const mk = async (digits, assigned) => {
    const c = await crm.collection(COLL.contacts).insertOne({ phoneE164: "+91" + digits, waId: "91" + digits, phoneKind: "mobile", name: "N" + digits, assignedTo: assigned, existingDealer: null, mergedInto: null, lastActivityAt: now, createdAt: now, updatedAt: now })
    const d = await crm.collection(COLL.deals).insertOne({ contactId: c.insertedId, stage: "new", isOpen: true, assignedTo: assigned, leadSource: "call", createdAt: now, updatedAt: now })
    return { c: c.insertedId, d: d.insertedId }
  }
  const mine = await mk("9811111111", me)
  const theirs = await mk("9822222222", other)
  const free = await mk("9833333333", null)
  const deps = mkDeps(U("sales_executive", "exec1"), ROLE_PERMISSIONS.sales_executive, { getDb: async () => crm })
  const list = await (await listLeadsHandler(req("GET", "http://x/api/crm/leads"), ctx, deps)).json()
  assert.equal(list.total, 1)
  assert.equal(list.items[0].contact.phoneE164, "+919811110000".replace("0000", "1111"))
  const l3 = await (await listLeadsHandler(req("GET", `http://x/api/crm/leads?assignee=${"b".repeat(24)}`), ctx, deps)).json()
  assert.equal(l3.total, 0)
  const l4 = await (await listLeadsHandler(req("GET", "http://x/api/crm/leads?assignee=unassigned"), ctx, deps)).json()
  assert.equal(l4.total, 0, "unassigned filter must not escape the assigned scope")
  const c = (id, suffix = "") => [req("GET", `http://x/api/crm/contacts/${id}${suffix}`), { params: Promise.resolve({ id: id.toHexString() }) }]
  assert.equal((await contactDetailHandler(...c(mine.c), deps)).status, 200)
  assert.equal((await contactDetailHandler(...c(theirs.c), deps)).status, 404)
  assert.equal((await contactDetailHandler(...c(free.c), deps)).status, 404)
  assert.equal((await contactTimelineHandler(...c(theirs.c, "/timeline"), deps)).status, 404)
  assert.equal((await contactTimelineHandler(...c(mine.c, "/timeline"), deps)).status, 200)
  assert.equal((await listNotesHandler(...c(theirs.c, "/notes"), deps)).status, 404)
  assert.equal((await listNotesHandler(...c(mine.c, "/notes"), deps)).status, 200)
  const nres = await createNoteHandler(new Request("http://x", { method: "POST", body: JSON.stringify({ text: "hi" }) }), { params: Promise.resolve({ id: theirs.c.toHexString() }) }, deps)
  assert.equal(nres.status, 404)
  const p = (id, body) => [new Request("http://x", { method: "PATCH", body: JSON.stringify(body) }), { params: Promise.resolve({ id: id.toHexString() }) }]
  assert.equal((await patchDealHandler(...p(theirs.d, { nextFollowUpAt: null }), deps)).status, 404)
  assert.equal((await patchDealHandler(...p(mine.d, { nextFollowUpAt: "2030-01-02T00:00:00Z" }), deps)).status, 200)
  const mgr = mkDeps(U("sales_manager", "mgr"), ROLE_PERMISSIONS.sales_manager, { getDb: async () => crm })
  assert.equal((await (await listLeadsHandler(req(), ctx, mgr)).json()).total, 3)
  const as = await patchDealHandler(...p(mine.d, { assignedTo: "c".repeat(24) }), deps)
  assert.equal(as.status, 403)
  assert.deepEqual((await as.json()).required, ["crm.leads.assign"])
})

test("middleware still protects the /api/crm/ prefix", () => {
  const mw = fs.readFileSync(path.join(ROOT, "middleware.ts"), "utf8")
  assert.match(mw, /\/api\/crm\//)
  // The only session-exempt CRM paths (each authenticates itself in the handler).
  const m = /CRM_SELF_AUTH_API_PATHS[^=]*=\s*new Set\(\[([^\]]*)\]\)/.exec(mw)
  assert.ok(m, "exempt set found")
  assert.deepEqual(m[1].split(",").map(x => x.trim().replace(/^"|"$/g, "")).filter(Boolean).sort(), ["/api/crm/health", "/api/crm/queue/run", "/api/crm/whatsapp/webhook"])
})
