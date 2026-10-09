// Fake @/lib/email: records what would have been sent; never sends.
import { state } from "./state.mjs"

export function isEmailConfigured() {
  return state.emailConfigured
}
export function adminRecipients() {
  return ["admin@example.test"]
}
export async function sendAdminEmail(args) {
  state.emails.push(args)
  return { ok: true }
}
