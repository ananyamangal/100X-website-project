// Shared WhatsApp webhook test helpers (step 3b+). Never uses real secrets or ids.
//
//   import { TEST_WA, loadFixture, signBody, signedWebhookRequest } from "./helpers/wa-sign.mjs"
//   const raw = loadFixture("text")                      // exact bytes as stored on disk
//   const req = signedWebhookRequest(raw)                // POST Request with X-Hub-Signature-256
//   const env = testWaEnv()                              // CrmEnv-shaped record for readCrmEnv()
//
// Fixtures live in ../fixtures/whatsapp/*.json (realistic Meta shapes, obviously fake ids):
//   phone_number_id 100000000000001 = allow-listed; 999999999999999 = NOT allow-listed;
//   customers 919800000001 (generic), 919800000002 (seed as an existing contact),
//   919800000003 (never seeded: new contact), 919800000004 (non-allow-listed sender);
//   outbound wamid for statuses: wamid.TEST_OUT_0001; media ids 9000000000000NN.
import { createHmac } from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/whatsapp")

export const TEST_WA = Object.freeze({
  appSecret: "test-app-secret-not-real",
  verifyToken: "test-verify-token-not-real",
  accessToken: "test-access-token-not-real",
  allowedPhoneNumberId: "100000000000001",
  disallowedPhoneNumberId: "999999999999999",
  wabaId: "200000000000001",
  outboundWamid: "wamid.TEST_OUT_0001",
  webhookUrl: "http://localhost/api/crm/whatsapp/webhook",
})

/** Fixture names without ".json". */
export function listFixtures() {
  return fs.readdirSync(FIXTURES).filter(f => f.endsWith(".json")).map(f => f.slice(0, -5)).sort()
}

/** Raw fixture text (sign THIS string; re-serialising changes bytes). */
export function loadFixture(name) {
  return fs.readFileSync(path.join(FIXTURES, name.endsWith(".json") ? name : `${name}.json`), "utf8")
}

export function loadFixtureJson(name) {
  return JSON.parse(loadFixture(name))
}

/** "sha256=<hex>" over the exact body bytes, keyed with the (trimmed) secret — Meta's header format. */
export function signBody(body, secret = TEST_WA.appSecret) {
  const buf = typeof body === "string" ? Buffer.from(body, "utf8") : Buffer.from(body)
  return "sha256=" + createHmac("sha256", String(secret).trim()).update(buf).digest("hex")
}

/** A POST Request as Meta would send it. `body` may be a string or an object (stringified once). */
export function signedWebhookRequest(body, { secret = TEST_WA.appSecret, signature, url = TEST_WA.webhookUrl, headers = {} } = {}) {
  const raw = typeof body === "string" ? body : JSON.stringify(body)
  const sig = signature === undefined ? signBody(raw, secret) : signature
  const h = { "content-type": "application/json", ...headers }
  if (sig !== null) h["x-hub-signature-256"] = sig
  return new Request(url, { method: "POST", headers: h, body: raw })
}

/** GET verify-handshake URL. */
export function verifyUrl({ mode = "subscribe", token = TEST_WA.verifyToken, challenge = "1158201444" } = {}) {
  const u = new URL(TEST_WA.webhookUrl)
  if (mode !== null) u.searchParams.set("hub.mode", mode)
  if (token !== null) u.searchParams.set("hub.verify_token", token)
  if (challenge !== null) u.searchParams.set("hub.challenge", challenge)
  return u
}

/** Env record for readCrmEnv(env) with test values (pass overrides to drop/alter one). */
export function testWaEnv(overrides = {}) {
  return {
    CRM_WA_APP_SECRET: TEST_WA.appSecret,
    CRM_WA_VERIFY_TOKEN: TEST_WA.verifyToken,
    CRM_WA_ACCESS_TOKEN: TEST_WA.accessToken,
    CRM_WA_PHONE_NUMBER_IDS: TEST_WA.allowedPhoneNumberId,
    CRM_WA_API_VERSION: "v23.0",
    CRON_SECRET: "test-cron-secret-not-real",
    ...overrides,
  }
}
