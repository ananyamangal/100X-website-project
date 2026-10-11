/**
 * Phone normalisation (docs/crm/DATA_MODEL.md §2). Two entry points, deliberately different:
 *
 * - fromWaId(): webhook wa_id / messages[].from. Trusted full international number:
 *   identity mapping ("+" + digits) after a length check only. No India heuristic.
 * - fromHumanInput(): manual forms, CSV, website forms, legacy rows. India heuristic table.
 *
 * Both return the same shape; the match key everywhere is the full E.164 string.
 */
import type { PhoneE164, PhoneKind, WaId } from "./model"

export type PhoneResult =
  | { ok: true; phoneE164: PhoneE164; waId: WaId; phoneKind: PhoneKind }
  | { ok: false; reason: "empty" | "invalid_phone" }

const E164_DIGITS = /^\d{8,15}$/

function make(digits: string, phoneKind: PhoneKind): PhoneResult {
  return { ok: true, phoneE164: ("+" + digits) as PhoneE164, waId: digits as WaId, phoneKind }
}

const INVALID: PhoneResult = { ok: false, reason: "invalid_phone" }
const EMPTY: PhoneResult = { ok: false, reason: "empty" }

/** Webhook wa_id → E.164. Accepts digits only (one leading "+" tolerated); 8–15 digits. */
export function fromWaId(waId: string | null | undefined): PhoneResult {
  if (typeof waId !== "string") return EMPTY
  let s = waId.trim()
  if (s === "") return EMPTY
  if (s.startsWith("+")) s = s.slice(1)
  if (!E164_DIGITS.test(s)) return INVALID
  return make(s, s.startsWith("91") ? "mobile" : "international")
}

/** Classify an Indian 10-digit national number. */
function india10(ten: string): PhoneResult {
  if (!/^\d{10}$/.test(ten)) return INVALID
  const first = ten.charCodeAt(0) - 48
  if (first >= 6 && first <= 9) return make("91" + ten, "mobile")
  if (first >= 1 && first <= 5) return make("91" + ten, "unverified_mobile")
  return INVALID // leading 0 after all trunk handling
}

/** "+"-prefixed digits (already stripped of the "+"). */
function plusForm(digits: string): PhoneResult {
  // "+91 0" + 10 digits: drop the trunk 0.
  if (digits.length === 13 && digits.startsWith("910")) digits = "91" + digits.slice(3)
  if (!E164_DIGITS.test(digits)) return INVALID
  if (digits.startsWith("91")) return india10(digits.slice(2))
  return make(digits, "international")
}

/** Human / CSV / form / legacy input → E.164 (DATA_MODEL §2 table, first matching rule wins). */
export function fromHumanInput(text: string | number | null | undefined): PhoneResult {
  if (text === null || text === undefined) return EMPTY
  const s = String(text).trim()
  if (s === "") return EMPTY
  const hasPlus = s.startsWith("+")
  const digits = s.replace(/\D/g, "")
  if (digits === "") return hasPlus ? INVALID : EMPTY

  if (hasPlus) return plusForm(digits)
  // "00" international prefix → treat exactly like "+".
  if (digits.startsWith("00")) {
    const rest = digits.slice(2)
    return E164_DIGITS.test(rest) || (rest.length === 13 && rest.startsWith("910")) ? plusForm(rest) : INVALID
  }
  switch (digits.length) {
    case 10:
      return india10(digits)
    case 11:
      return digits.startsWith("0") ? india10(digits.slice(1)) : INVALID
    case 12:
      return digits.startsWith("91") ? india10(digits.slice(2)) : INVALID
    case 13:
      return digits.startsWith("091") ? india10(digits.slice(3)) : INVALID
    default:
      return INVALID
  }
}
