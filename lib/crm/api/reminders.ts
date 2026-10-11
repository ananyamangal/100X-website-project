/** /api/crm/reminders/* (STEP 7): rule table + manual run. crm.settings.edit. Imports no notes module. */
import { crmError, crmJson } from "./auth"
import { readJsonObject } from "../validate"
import { COLL } from "../model"
import { createRule, listRules, parseRuleInput, ruleView, SUGGESTED_RULES, updateRule } from "../reminders/rules"
import { driveReminders } from "../reminders/drive"
import { readCrmEnv } from "../env"
import { idParam, nowOf, route } from "./route"

/** GET /api/crm/reminders/rules — rules + suggested presets. */
export const listRulesHandler = route("reminders.rules.list", ["crm.settings.edit"], async ({ deps, requestId }) => {
  const crm = await deps.getDb()
  return crmJson({ items: (await listRules(crm)).map(ruleView), suggested: SUGGESTED_RULES }, requestId)
})

/** POST /api/crm/reminders/rules */
export const createRuleHandler = route("reminders.rules.create", ["crm.settings.edit"], async ({ request, deps, requestId, actor }) => {
  const body = await readJsonObject(request)
  if (!body) return crmError(400, "invalid_json", requestId)
  const p = parseRuleInput(body, null)
  if (!p.ok) return crmError(400, "validation", requestId, { fields: p.fields })
  const crm = await deps.getDb()
  return crmJson({ rule: ruleView(await createRule(crm, actor, p.rule, nowOf(deps))) }, requestId, 201)
})

/** PATCH /api/crm/reminders/rules/:id (deactivate with {active:false}; rules are never deleted). */
export const updateRuleHandler = route("reminders.rules.update", ["crm.settings.edit"], async ({ request, ctx, deps, requestId, actor }) => {
  const id = await idParam(ctx)
  if (!id) return crmError(400, "validation", requestId, { fields: { id: "invalid_id" } })
  const body = await readJsonObject(request)
  if (!body) return crmError(400, "invalid_json", requestId)
  const crm = await deps.getDb()
  const before = await crm.collection(COLL.reminderRules).findOne({ _id: id })
  if (!before) return crmError(404, "not_found", requestId)
  const p = parseRuleInput(body, before)
  if (!p.ok) return crmError(400, "validation", requestId, { fields: p.fields })
  return crmJson({ rule: ruleView(await updateRule(crm, actor, id, p.rule, before, nowOf(deps))) }, requestId)
})

/** POST /api/crm/reminders/run — evaluate every active rule now (bounded) and send due reminder jobs. */
export const runRemindersHandler = route("reminders.run", ["crm.settings.edit"], async ({ deps, requestId, log }) => {
  const crm = await deps.getDb()
  const r = await driveReminders(crm, { env: deps.env ?? readCrmEnv(), fetch: deps.fetch, requestId, now: nowOf(deps), lazy: false })
  const tally = r.evaluated
  log.info("reminders evaluated", { rules: tally?.rules ?? 0, tasksCreated: tally?.tasksCreated ?? 0, customerQueued: tally?.customerQueued ?? 0, jobsDone: r.jobs?.done ?? 0, jobsFailed: r.jobs?.failed ?? 0 })
  return crmJson({ tally, jobs: r.jobs, jobsSkipped: r.jobsSkipped }, requestId)
})
