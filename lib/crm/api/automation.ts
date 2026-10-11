/** /api/crm/settings/automation (STEP 8): business hours, auto replies, keyword rules, STOP keywords. crm.settings.edit. */
import type { Document } from "mongodb"
import { crmError, crmJson, userRefOf } from "./auth"
import { readJsonObject } from "../validate"
import { logCrmAction } from "../audit"
import { COLL } from "../model"
import { AUTOMATION_TEXTS } from "../outbound/compose"
import { SUGGESTED_KEYWORD_RULES, formatBusinessHours, loadAutomationSettings, parseAutomationSettings, type AutomationSettings } from "../automation/settings"
import { auditCtx, nowOf, route } from "./route"

const summary = (s: AutomationSettings) => ({
  days: s.businessHours.days.join(","), open: s.businessHours.open, close: s.businessHours.close,
  autoAck: s.autoAck.enabled, autoAckCustomText: !!(s.autoAck.text || s.autoAck.textHi),
  afterHours: s.afterHoursReply.enabled, afterHoursCustomText: !!(s.afterHoursReply.text || s.afterHoursReply.textHi), minIntervalHours: s.afterHoursReply.minIntervalHours,
  keywordRules: s.keywordRules.length, stopKeywords: s.stopKeywords.length,
})

export const getAutomationHandler = route("settings.automation.get", ["crm.settings.edit"], async ({ deps, requestId }) => {
  const crm = await deps.getDb()
  const settings = await loadAutomationSettings(crm)
  return crmJson({
    settings,
    hoursText: formatBusinessHours(settings.businessHours),
    defaults: { autoAck: AUTOMATION_TEXTS.auto_ack, afterHours: AUTOMATION_TEXTS.after_hours },
    suggestedKeywordRules: SUGGESTED_KEYWORD_RULES,
  }, requestId)
})

export const putAutomationHandler = route("settings.automation.put", ["crm.settings.edit"], async ({ request, deps, requestId, actor }) => {
  const body = await readJsonObject(request, 64 * 1024)
  if (!body) return crmError(400, "invalid_json", requestId)
  const p = parseAutomationSettings(body)
  if (!p.ok) return crmError(400, "validation", requestId, { fields: p.fields })
  const crm = await deps.getDb()
  const before = await loadAutomationSettings(crm)
  const now = nowOf(deps)
  await crm.collection(COLL.settings).updateOne({ _id: crm.workspace } as Document, { $set: { ...p.settings, updatedAt: now, updatedBy: userRefOf(actor) } }, { upsert: true })
  await logCrmAction(crm, userRefOf(actor), "settings.automation", { type: "settings", id: "automation" }, { before: summary(before), after: summary(p.settings), ...auditCtx(request) })
  return crmJson({ settings: p.settings, hoursText: formatBusinessHours(p.settings.businessHours) }, requestId)
})
