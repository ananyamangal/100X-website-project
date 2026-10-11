/**
 * Typed, trimmed reader for the CRM env names listed in CRM_ENV (lib/crm/model.ts).
 *
 * - Every value is trimmed on read; an empty / whitespace-only value counts as unset.
 * - Nothing here logs. `describeCrmEnv()` reports presence only (never secret values),
 *   so it is safe for /health and startup diagnostics.
 * - Reads `process.env` by default; pass an explicit record in tests.
 */
import { CRM_ENV } from "./model"

type EnvRecord = Record<string, string | undefined>

export interface CrmEnv {
  /** CRM_GROWTH_OS_SYNC — default ON; trimmed "0" | "false" | "off" (any case) = off. */
  growthSync: boolean
  /** CRM_WEBSITE_INGEST — kill switch, DEFAULT OFF; only trimmed "on" | "1" | "true" enables website → CRM ingest. */
  websiteIngest: boolean
  /** CRM_MONGODB_DB — CRM-only DB name (staging). Unset = DB named in MONGODB_URI. */
  mongoDb: string | undefined
  /** CRM_PROD_DB_NAME — the production DB name the non-production guard compares against. */
  prodDbName: string | undefined
  /** CRM_ALLOW_PROD_DB — exactly "1" lets a non-production env use the prod DB deliberately. */
  allowProdDb: boolean
  publicBaseUrl: string | undefined
  previewBypass: string | undefined
  healthSecret: string | undefined
  /** CRM_WA_PHONE_NUMBER_IDS — comma list, trimmed, empties dropped, de-duplicated. */
  waPhoneNumberIds: string[]
  waAppSecret: string | undefined
  waVerifyToken: string | undefined
  waAccessToken: string | undefined
  waApiVersion: string | undefined
  /** CRM_WA_WABA_ID — the fogging WABA id (template sync). */
  waWabaId: string | undefined
  /** VERCEL_ENV ("production" | "preview" | "development"), trimmed; undefined locally. */
  vercelEnv: string | undefined
}

/** Trim; empty → undefined. */
export function envValue(env: EnvRecord, name: string): string | undefined {
  const raw = env[name]
  if (typeof raw !== "string") return undefined
  const v = raw.trim()
  return v === "" ? undefined : v
}

/** "0" | "false" | "off" (trimmed, case-insensitive) = false; unset/empty = `fallback`; anything else = true. */
export function envFlag(env: EnvRecord, name: string, fallback: boolean): boolean {
  const v = envValue(env, name)
  if (v === undefined) return fallback
  return !/^(0|false|off)$/i.test(v)
}

export function readCrmEnv(env: EnvRecord = process.env): CrmEnv {
  const ids = (envValue(env, CRM_ENV.waPhoneNumberIds) ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean)
  return {
    growthSync: envFlag(env, CRM_ENV.growthSync, true),
    websiteIngest: ["on", "1", "true"].includes(envValue(env, CRM_ENV.websiteIngest) ?? ""),
    mongoDb: envValue(env, CRM_ENV.mongoDb),
    prodDbName: envValue(env, CRM_ENV.prodDbName),
    allowProdDb: envValue(env, CRM_ENV.allowProdDb) === "1",
    publicBaseUrl: envValue(env, CRM_ENV.publicBaseUrl),
    previewBypass: envValue(env, CRM_ENV.previewBypass),
    healthSecret: envValue(env, CRM_ENV.healthSecret),
    waPhoneNumberIds: Array.from(new Set(ids)),
    waAppSecret: envValue(env, CRM_ENV.waAppSecret),
    waVerifyToken: envValue(env, CRM_ENV.waVerifyToken),
    waAccessToken: envValue(env, CRM_ENV.waAccessToken),
    waApiVersion: envValue(env, CRM_ENV.waApiVersion),
    waWabaId: envValue(env, CRM_ENV.waWabaId),
    vercelEnv: envValue(env, "VERCEL_ENV"),
  }
}

/** Presence-only summary, safe to log or return from /health. Never includes secret values. */
export function describeCrmEnv(env: EnvRecord = process.env): Record<string, string | boolean | number> {
  const e = readCrmEnv(env)
  return {
    growthSync: e.growthSync,
    websiteIngest: e.websiteIngest,
    mongoDb: e.mongoDb ?? "(default from MONGODB_URI)",
    prodDbNameSet: e.prodDbName !== undefined,
    allowProdDb: e.allowProdDb,
    publicBaseUrlSet: e.publicBaseUrl !== undefined,
    previewBypassSet: e.previewBypass !== undefined,
    healthSecretSet: e.healthSecret !== undefined,
    waPhoneNumberIdCount: e.waPhoneNumberIds.length,
    waAppSecretSet: e.waAppSecret !== undefined,
    waVerifyTokenSet: e.waVerifyToken !== undefined,
    waAccessTokenSet: e.waAccessToken !== undefined,
    waApiVersion: e.waApiVersion ?? "(unset)",
    waWabaIdSet: e.waWabaId !== undefined,
    vercelEnv: e.vercelEnv ?? "(unset)",
  }
}
