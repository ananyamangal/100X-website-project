// Run: node --import ./tests/support/register.mjs --test tests/unit/knowledge-rbac.test.mjs
import test from "node:test"
import assert from "node:assert/strict"
import { canAccessAdminApi, isRestrictedRole } from "../../lib/rbac/access.ts"
import { ROLE_PERMISSIONS } from "../../lib/rbac/roles.ts"
import { PERMISSION_REGISTRY } from "../../lib/rbac/permissions.ts"

const REBUILD = "/api/admin/knowledge/rebuild"

test("knowledge.rebuild is registered exactly once, in the Knowledge Hub group", () => {
  const rows = PERMISSION_REGISTRY.filter((p) => p.key === "knowledge.rebuild")
  assert.equal(rows.length, 1)
  assert.equal(rows[0].module, "knowledge")
  assert.equal(rows[0].group, "Content & CMS")
})

test("only super_admin and growth_admin hold knowledge.rebuild; growth_admin also gets view + edit", () => {
  const holders = Object.entries(ROLE_PERMISSIONS).filter(([, perms]) => perms.includes("knowledge.rebuild")).map(([r]) => r).sort()
  assert.deepEqual(holders, ["growth_admin", "super_admin"])
  for (const role of holders) for (const k of ["knowledge.view", "knowledge.edit"]) assert.ok(ROLE_PERMISSIONS[role].includes(k), `${role} ${k}`)
})

test("seo_team / content_team hold knowledge.edit but cannot reach the rebuild route (GET or POST)", () => {
  for (const role of ["seo_team", "content_team"]) {
    const perms = ROLE_PERMISSIONS[role]
    assert.ok(perms.includes("knowledge.edit"), `${role} still edits articles`)
    assert.equal(isRestrictedRole(role), true)
    assert.equal(canAccessAdminApi(perms, "GET", REBUILD), false, `${role} GET`)
    assert.equal(canAccessAdminApi(perms, "POST", REBUILD), false, `${role} POST`)
    assert.equal(canAccessAdminApi(perms, "GET", "/api/admin/knowledge"), true, `${role} can still read articles`)
    assert.equal(canAccessAdminApi(perms, "PUT", "/api/admin/knowledge"), true, `${role} can still save articles`)
  }
})

test("a confined user explicitly granted knowledge.rebuild can reach it (permission-driven, not role-driven)", () => {
  const perms = [...ROLE_PERMISSIONS.content_team, "knowledge.rebuild"]
  assert.equal(canAccessAdminApi(perms, "GET", REBUILD), true)
  assert.equal(canAccessAdminApi(perms, "POST", REBUILD), true)
})

test("a paths beneath the rebuild route are covered by the same rule; growth_admin/super_admin are not gated by the perimeter", () => {
  assert.equal(canAccessAdminApi(ROLE_PERMISSIONS.content_team, "GET", REBUILD + "/anything"), false)
  assert.equal(isRestrictedRole("growth_admin"), false)
  assert.equal(isRestrictedRole("super_admin"), false)
})
