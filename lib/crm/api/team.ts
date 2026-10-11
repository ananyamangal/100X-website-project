/** GET /api/crm/team. Kept apart from leads.ts so this route never reaches lib/crm/notes (manual entry imports it). */
import { crmJson } from "./auth"
import { assignableOf, route } from "./route"

// ─────────────────────────────────────────────────────────────────────────────
// /api/crm/team
// ─────────────────────────────────────────────────────────────────────────────

/** GET /api/crm/team — assignable users, id + name only. crm.view. */
export const teamHandler = route("team", [], async ({ deps, requestId }) => {
  const users = await assignableOf(deps)()
  return crmJson({ items: users.map(u => ({ id: u.id, name: u.name })) }, requestId)
})
