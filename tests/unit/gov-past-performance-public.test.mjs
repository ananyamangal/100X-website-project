// Run: node --test tests/unit/gov-past-performance-public.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import {
  PUBLIC_API_FIELDS,
  PUBLIC_PAGE_FIELDS,
  pickPublic,
  projectionFor,
} from "../../lib/govPastPerformancePublic.ts"

const DOC = {
  _id: { toString: () => "abc123" },
  organization: "Municipal Corporation X",
  department: "Health",
  state: "Bihar",
  product: "Thermal Fogger",
  category: "Municipal Bodies",
  status: "Completed",
  orderYear: 2024,
  verified: true,
  quantity: 12,
  orderValue: 18.5,
  notes: "internal negotiation notes",
  documents: [{ url: "https://x/y.pdf", name: "PO" }],
  images: ["https://x/i.jpg"],
  isPublic: true,
  createdAt: "2024-01-01",
  someFutureInternalField: "secret",
}

test("public API: strips notes, documents and orderValue (and everything else not allow-listed)", () => {
  const out = pickPublic(DOC, PUBLIC_API_FIELDS)
  for (const banned of ["notes", "documents", "orderValue", "images", "quantity", "isPublic", "createdAt", "someFutureInternalField"]) {
    assert.equal(banned in out, false, `${banned} must not be public`)
  }
})

test("public API: keeps exactly what the supply cards use", () => {
  const out = pickPublic(DOC, PUBLIC_API_FIELDS)
  assert.deepEqual(Object.keys(out).sort(), ["_id", ...PUBLIC_API_FIELDS].sort())
  assert.equal(out._id, "abc123")
  assert.equal(out.verified, true)
  assert.equal(out.orderYear, 2024)
})

test("page payload: identical to the API card fields; quantity, orderValue, notes, documents, images never reach the browser", () => {
  assert.deepEqual([...PUBLIC_PAGE_FIELDS], [...PUBLIC_API_FIELDS])
  const out = pickPublic(DOC, PUBLIC_PAGE_FIELDS)
  for (const banned of ["quantity", "orderValue", "notes", "documents", "images", "isPublic", "createdAt", "someFutureInternalField"]) {
    assert.equal(banned in out, false, `${banned} must not reach the browser`)
  }
  assert.equal(out.organization, "Municipal Corporation X")
  assert.equal(out.verified, true)
})

test("the public page component no longer renders quantity, orderValue or notes", () => {
  const src = readFileSync(new URL("../../components/trust/GovPerformanceCards.tsx", import.meta.url), "utf8")
  for (const gone of ["record.quantity", "record.orderValue", "record.notes", "Order Value", "Units Supplied", "Supply Details"]) {
    assert.equal(src.includes(gone), false, gone)
  }
})

test("missing optional fields are omitted, not sent as undefined/null", () => {
  const out = pickPublic({ _id: "1", organization: "A" }, PUBLIC_API_FIELDS)
  assert.deepEqual(out, { _id: "1", organization: "A" })
})

test("projection is an inclusion list of the same fields", () => {
  assert.deepEqual(Object.keys(projectionFor(PUBLIC_API_FIELDS)).sort(), [...PUBLIC_API_FIELDS].sort())
  assert.ok(Object.values(projectionFor(PUBLIC_API_FIELDS)).every((v) => v === 1))
})

test("the route applies the projection and the allow-list (guards against a revert to whole documents)", () => {
  const src = readFileSync(new URL("../../app/api/gov-past-performance/route.ts", import.meta.url), "utf8")
  assert.match(src, /projection:\s*projectionFor\(PUBLIC_API_FIELDS\)/)
  assert.match(src, /pickPublic\(d,\s*PUBLIC_API_FIELDS\)/)
  assert.doesNotMatch(src, /\.\.\.d\b/)
})
