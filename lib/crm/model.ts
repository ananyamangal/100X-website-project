/**
 * 100X fogging CRM + WhatsApp inbox — data model (types, constants, index specs).
 *
 * Design source of truth: docs/crm/DATA_MODEL.md and docs/DECISIONS.md §11–§18.
 *
 * Rules for this file:
 * - Types and plain constants only. No DB calls, no I/O, no imports.
 * - Never import anything from lib/growth-os/* (and Growth OS never imports lib/crm/*).
 *   The two systems meet only through the crm_conversion_events collection and the
 *   CSV exports (ADR §15).
 * - Every persisted document carries `workspace`. Code never sets it by hand: the
 *   scoped-collection wrapper (lib/crm/db.ts, step 3) injects and asserts it (ADR §12).
 */

// ─────────────────────────────────────────────────────────────────────────────
// Workspace
// ─────────────────────────────────────────────────────────────────────────────

export const WORKSPACES = ["fogging"] as const
export type Workspace = (typeof WORKSPACES)[number]
export const DEFAULT_WORKSPACE: Workspace = "fogging"

/**
 * Opaque ids. Stored in Mongo as ObjectId (both _id and references such as contactId/dealId);
 * these branded strings are the hex form at the API/type boundary, so a ContactId cannot be
 * passed as a DealId. lib/crm/db.ts converts at the edge.
 */
type Id<B extends string> = string & { readonly __id: B }
export type ContactId = Id<"contact">
export type DealId = Id<"deal">
export type ConversationId = Id<"conversation">
export type MessageId = Id<"message">
export type QuotationId = Id<"quotation">
export type BroadcastId = Id<"broadcast">
export type TaskId = Id<"task">
export type RuleId = Id<"rule">
export type SegmentId = Id<"segment">
export type UserId = string // rbac_users._id as string (100X RBAC owns users)

/** E.164 with leading "+", e.g. "+919876543210". Produced only by normalisePhone(). */
export type PhoneE164 = string & { readonly __phone: "E164" }
/** Meta wa_id = E.164 digits without "+", e.g. "919876543210". */
export type WaId = string & { readonly __phone: "wa_id" }

/** Money is always integer paise. Display/export converts to rupees. */
export type Paise = number

// ─────────────────────────────────────────────────────────────────────────────
// Collection names — none collide with legacy crm_dealers / crm_opportunities
// ─────────────────────────────────────────────────────────────────────────────

export const COLL = {
  contacts: "crm_contacts",
  deals: "crm_deals",
  activities: "crm_activities",
  internalNotes: "crm_internal_notes",
  conversations: "crm_conversations",
  messages: "crm_messages",
  waEvents: "crm_wa_events",
  waNumbers: "crm_wa_numbers",
  waTemplates: "crm_wa_templates",
  sendLedger: "crm_send_ledger",
  optOuts: "crm_optouts",
  quotations: "crm_quotations",
  /** Issued quotation PDFs (bytes), _id = quotation _id. Private: served only via the CRM API. */
  quotationPdfs: "crm_quotation_pdfs",
  counters: "crm_counters",
  tasks: "crm_tasks",
  reminderRules: "crm_reminder_rules",
  jobs: "crm_jobs",
  broadcasts: "crm_broadcasts",
  broadcastRecipients: "crm_broadcast_recipients",
  segments: "crm_segments",
  dealerDirectory: "crm_dealer_directory",
  imports: "crm_imports",
  attribution: "crm_attribution",
  conversionEvents: "crm_conversion_events",
  settings: "crm_settings",
  locks: "crm_locks",
  audit: "crm_audit",
} as const
export type CollectionKey = keyof typeof COLL
export type CollectionName = (typeof COLL)[CollectionKey]

/** Legacy collections: read-only sources for the one-time migration (and Growth OS Customer Match). */
export const LEGACY_COLL = { dealers: "crm_dealers", opportunities: "crm_opportunities" } as const

/**
 * Collections the SALES-facing API/UI must never read. Enforced by the static test
 * (only lib/crm/growth/**, lib/crm/website.ts and lib/crm/conversions.ts may reference these
 * constants) — ADR §15.
 */
export const SALES_INVISIBLE_COLLECTIONS: readonly CollectionName[] = [COLL.attribution, COLL.conversionEvents]

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export const STAGES = [
  "new",
  "contacted",
  "requirement_shared",
  "quotation_sent",
  "sample_requested",
  "negotiation",
  "po_received",
  "invoice_raised",
  "payment_received",
  "dispatched",
  "closed_won",
  "closed_lost",
  "repeat_enquiry",
] as const
export type Stage = (typeof STAGES)[number]

export const STAGE_LABEL: Record<Stage, string> = {
  new: "New",
  contacted: "Contacted",
  requirement_shared: "Requirement Shared",
  quotation_sent: "Quotation Sent",
  sample_requested: "Sample Requested",
  negotiation: "Negotiation",
  po_received: "PO Received",
  invoice_raised: "Invoice Raised",
  payment_received: "Payment Received",
  dispatched: "Dispatched",
  closed_won: "Closed-Won",
  closed_lost: "Closed-Lost",
  repeat_enquiry: "Repeat Enquiry",
}

export const CLOSED_STAGES: readonly Stage[] = ["closed_won", "closed_lost"]
/** Stages a new deal may start in. */
export const ENTRY_STAGES: readonly Stage[] = ["new", "repeat_enquiry"]

export const CUSTOMER_TYPES = ["dealer", "gem_supplier", "govt_dept", "govt_officer", "b2c", "other"] as const
export type CustomerType = (typeof CUSTOMER_TYPES)[number]
export const CUSTOMER_TYPE_LABEL: Record<CustomerType, string> = {
  dealer: "Dealer",
  gem_supplier: "GeM supplier",
  govt_dept: "Government dept",
  govt_officer: "Government officer",
  b2c: "B2C",
  other: "Other",
}

export const LEAD_SOURCES = ["call", "whatsapp", "website", "gem", "referral", "existing_dealer"] as const
export type LeadSource = (typeof LEAD_SOURCES)[number]

export const LOST_REASONS = [
  "price_too_high",
  "chose_competitor",
  "no_budget",
  "no_response",
  "requirement_changed",
  "tender_lost",
  "specs_mismatch",
  "delivery_timeline",
  "duplicate_or_spam",
  "other",
] as const
export type LostReason = (typeof LOST_REASONS)[number]

export const GST_RATES = [0, 5, 12, 18, 28] as const
export type GstRate = (typeof GST_RATES)[number]

export const WA_LANGUAGES = ["en_US", "hi"] as const
export type WaLanguage = (typeof WA_LANGUAGES)[number]

// ─────────────────────────────────────────────────────────────────────────────
// Common mixins
// ─────────────────────────────────────────────────────────────────────────────

export interface Scoped {
  workspace: Workspace
}

export interface Timestamps {
  createdAt: Date
  updatedAt: Date
}

export interface UserRef {
  userId: UserId
  name: string // denormalised display name at write time
}

/** Shared queue shape used by crm_jobs, crm_broadcast_recipients and crm_wa_events (ADR §16). */
/** "ignored": wa_events only — a status for a wamid with no crm_messages row after maxAttempts (not ours). */
export type QueueStatus = "pending" | "leased" | "done" | "failed" | "dead" | "cancelled" | "ignored"
export interface QueueFields {
  status: QueueStatus
  attempts: number
  maxAttempts: number
  nextAttemptAt: Date
  leaseUntil: Date | null
  leaseOwner: string | null // invocation id
  lastError: { code?: string | number; message: string; at: Date; retryable: boolean } | null
  /** Unique per workspace when present: re-enqueueing the same logical work is a no-op. */
  idempotencyKey?: string
  doneAt: Date | null
  /** TTL anchor set when the item reaches a terminal state. */
  expireAt?: Date
}

// ─────────────────────────────────────────────────────────────────────────────
// Contacts — one per customer, keyed by E.164 mobile (ADR §13)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * "mobile": Indian number with a 6–9 leading digit, or any webhook wa_id (WhatsApp proved it).
 * "unverified_mobile": human/CSV input that normalised to a valid +91 E.164 but may be a landline
 *   (1–5 leading digit). Still a WhatsApp candidate (WA Business runs on landlines too).
 * "international": non-+91, length-checked only.
 */
export type PhoneKind = "mobile" | "unverified_mobile" | "international"

export interface SuggestedTag {
  field: "customerType" | "interestTag"
  value: string
  keyword: string
  /** null when the suggestion did not come from a message (e.g. a dealer-directory match on a form lead). */
  fromMessageId: MessageId | null
  status: "pending" | "accepted" | "rejected"
  decidedBy?: UserRef
  at: Date
}

export interface Contact extends Scoped, Timestamps {
  _id: ContactId
  phoneE164: PhoneE164 // REQUIRED, unique per workspace — the customer key
  waId: WaId // phoneE164 without "+"; a 131026 send failure flags the contact, waId is never nulled
  notOnWhatsApp: Date | null
  phoneKind: PhoneKind
  altPhones: PhoneE164[] // secondary numbers; dedupe checks these too (non-unique)
  name: string | null // human-entered name
  waProfileName: string | null // from webhook contacts[].profile.name
  company: string | null
  customerType: CustomerType | null
  state: string | null
  city: string | null
  email: string | null
  language: WaLanguage // template language preference; default en_US
  interestTags: string[] // confirmed tags ("gem", "tender", model slugs...)
  suggestions: SuggestedTag[] // keyword auto-tagging, pending human confirm
  existingDealer: { directoryId: string; matchedAt: Date } | null
  assignedTo: UserRef | null
  marketingOptOut: { at: Date; via: OptOutVia } | null // mirror of crm_optouts
  amcDueAt: Date | null
  lastActivityAt: Date
  /** No submissionId here: the form link lives only in crm_attribution (sales-invisible, ADR §15). */
  origin: { channel: LeadSource | "import" | "legacy"; legacyRef?: LegacyRef }
  mergedInto: ContactId | null // set on the losing side of a manual merge
  createdBy: UserRef | { system: "webhook" | "website" | "import" | "migration" }
  /** Set when this number is a team member's own WhatsApp (crm_settings.staff): task pushes, never a deal (STEP 7). */
  staffUserId?: UserId | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Deals — one per enquiry; at most one OPEN deal per contact (ADR §13)
// ─────────────────────────────────────────────────────────────────────────────

export interface StageChange {
  from: Stage | null // null for the creating entry
  to: Stage
  at: Date
  by: UserRef | { system: string }
  note?: string
}

export interface ProductInterest {
  productSlug: string | null // 100X products.slug when known
  label: string // free text as captured
  qty: number | null
}

export interface Deal extends Scoped, Timestamps {
  _id: DealId
  contactId: ContactId
  stage: Stage
  stageEnteredAt: Date
  stageHistory: StageChange[] // append-only; every change logged (also in crm_activities)
  isOpen: boolean // false iff stage ∈ CLOSED_STAGES
  isRepeat: boolean
  leadSource: LeadSource
  customerType: CustomerType | null // snapshot kept in sync while open (reports group by it)
  assignedTo: UserRef | null
  productInterest: ProductInterest[]
  intent: { wantsQuote: boolean; wantsDealer: boolean } | null
  state: string | null
  city: string | null
  nextFollowUpAt: Date | null
  lastQuotation: { quotationId: QuotationId; quoteNumber: string; version: number; grandTotal: Paise; sentAt: Date | null } | null
  /** = won.wonAt | lost.lostAt; null while open. Drives repeat-enquiry quiet days + reports. */
  closedAt: Date | null
  won: { invoiceNumber: string; invoiceAmountText: string | null; orderValue: Paise; wonAt: Date } | null
  lost: { reason: LostReason; text: string | null; lostAt: Date } | null
  customerReminders: { quoteFollowUp: boolean; serviceAmc: boolean } // opt-in per lead, default false
  origin: {
    channel: LeadSource | "import" | "legacy"
    conversationId?: ConversationId
    firstMessageId?: MessageId
    legacyRef?: LegacyRef
  }
  createdBy: UserRef | { system: string }
}

/** Fields required to ENTER a guarded stage (all other transitions are free). */
export const STAGE_GUARDS: Partial<Record<Stage, readonly string[]>> = {
  closed_won: ["won.invoiceNumber", "won.orderValue"],
  closed_lost: ["lost.reason"], // + lost.text when reason === "other"
}

// ─────────────────────────────────────────────────────────────────────────────
// Timeline — crm_activities (customer history; WA messages are merged in at read time)
// ─────────────────────────────────────────────────────────────────────────────

export type ActivityKind =
  | "call_log"
  | "web_form"
  | "stage_change"
  | "assignment"
  | "quotation_issued"
  | "quotation_sent"
  | "task_done"
  | "field_change"
  | "existing_dealer_match"
  | "opt_out"
  | "merge"

export interface Activity extends Scoped {
  _id: string
  contactId: ContactId
  dealId: DealId | null
  kind: ActivityKind
  at: Date
  by: UserRef | { system: string }
  /** Short human summary for the timeline row. Never contains internal-note text. */
  summary: string
  /** kind-specific; web_form MUST be WebFormActivityData (explicit whitelist), never a copy of the submission. */
  data: Record<string, unknown>
}

/**
 * The ONLY submission fields copied to a web_form activity. Never `attribution`, `form_page_url`
 * (its query string can carry gclid/utm), `_id`/submissionId, or any unlisted key.
 */
export const WEB_FORM_ACTIVITY_FIELDS = [
  "type", "productName", "subject", "message", "company", "state", "email", "intent", "wantsQuote", "wantsDealer",
] as const
export type WebFormActivityData = Partial<Record<(typeof WEB_FORM_ACTIVITY_FIELDS)[number], string | boolean>>

// ─────────────────────────────────────────────────────────────────────────────
// Internal notes — separate collection, separate brand, never outbound (ADR §14)
// ─────────────────────────────────────────────────────────────────────────────

declare const internalNoteBrand: unique symbol
declare const outboundBrand: unique symbol

/**
 * Text of an internal note. Only lib/crm/notes/** creates values of this type.
 *
 * HONEST LIMIT (ADR §14): brands stop DIRECT passing of a note value only. `.trim()`, template
 * literals, `String()` etc. drop the brand and type-check. The real guarantees are (1) the
 * module-import rule (no outbound/broadcast/queue/automation/reminders/growth/ai/flows module
 * imports lib/crm/notes) and (2) the send gate's hash tripwire. Brands are a lint, not a wall.
 */
export type InternalNoteText = string & { readonly [internalNoteBrand]: true }

/**
 * The ONLY text type any outbound path accepts (free-form body, template parameter,
 * document caption, auto-reply). Minted only in lib/crm/outbound/compose.ts by:
 * fromComposer(request DTO), fromTemplateParam(contact/deal field), fromAutomationSetting(),
 * fromPersistedOutbound(messageId | recipientId) — re-reads text/params already stored on a
 * crm_messages / crm_broadcast_recipients row, for queued retries and broadcast sends.
 * The static test bans explicit type arguments on these functions and `as OutboundText`,
 * `as any`, `as never`, `as unknown as`, and `<T>x` casts under lib/crm/{outbound,broadcast,queue}/**.
 */
export type OutboundText = string & { readonly [outboundBrand]: true }

/**
 * Compile-time trap for producer functions: `fn<T extends string>(t: NotInternalNote<T>)`
 * resolves to `never` when T is (or extends) InternalNoteText, so passing a note is a type error.
 */
export type NotInternalNote<T extends string> = T extends InternalNoteText ? never : T

export interface InternalNote extends Scoped {
  _id: string
  contactId: ContactId
  dealId: DealId | null
  author: UserRef
  at: Date
  text: InternalNoteText
  /** sha256 of whitespace/case-normalised text. The send gate projects {textHash:1} ONLY. */
  textHash: string
  editedAt: Date | null
  deletedAt: Date | null
}

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp: numbers, conversations, messages, raw events, templates
// ─────────────────────────────────────────────────────────────────────────────

export interface WaNumber extends Scoped, Timestamps {
  _id: string
  phoneNumberId: string // Meta phone_number_id — allow-list key (also env CRM_WA_PHONE_NUMBER_IDS)
  wabaId: string
  displayPhone: PhoneE164
  /** Unique business-initiated recipients per rolling 24h. Owner-edited: 250 → 1000 → 10000. */
  tierCap: number
  tierCapSafetyMargin: number // reserve kept free for staff/quote/reminder sends, e.g. 20
  qualityRating: "GREEN" | "YELLOW" | "RED" | "UNKNOWN"
  sendingPaused: { reason: string; at: Date; until: Date | null } | null
  // /health
  lastWebhookAt: Date | null
  lastInboundAt: Date | null
  lastSendAt: Date | null
  lastSendError: { code: string | number; message: string; at: Date } | null
}

export interface ConversationFlowState {
  // Phase 2 (button qualification / AI agent). Reserved, unused in phase 1.
  flowId: string
  step: string
  data: Record<string, unknown>
  expiresAt: Date
}

export interface Conversation extends Scoped, Timestamps {
  _id: ConversationId
  contactId: ContactId
  phoneNumberId: string
  waId: WaId
  status: "open" | "resolved"
  hasUnread: boolean
  unreadCount: number
  lastMessageAt: Date
  /** Inbound message waTimestamp, written with $max (out-of-order webhooks cannot move it back). Drives the 24h window. */
  lastInboundAt: Date | null
  lastOutboundAt: Date | null
  /** ≤120 chars, from a customer message or an outbound we sent. Never from a note. */
  lastMessagePreview: string
  assignedTo: UserRef | null
  stage: Stage | null // denormalised from the open deal for inbox filtering
  autoAckSentAt: Date | null
  lastAutoReplyAt: Date | null
  resolvedAt: Date | null
  resolvedBy: UserRef | null
  handler: "human" | "bot" | "ai" // phase 1 always "human"
  flow: ConversationFlowState | null // phase 2
}

export type WaMessageType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "sticker"
  | "location"
  | "contacts"
  | "interactive"
  | "button"
  | "reaction"
  | "template"
  | "unsupported"

export type DeliveryStatus = "queued" | "sent" | "delivered" | "read" | "failed"
/** Statuses can arrive out of order; only move forward by rank (failed is terminal). */
export const DELIVERY_STATUS_RANK: Record<DeliveryStatus, number> = { queued: 0, sent: 1, delivered: 2, read: 3, failed: 4 }

export interface MediaRef {
  waMediaId: string | null
  mime: string
  sha256: string | null
  filename: string | null
  caption: string | null
  bytes: number | null
  cloudinaryPublicId: string | null
  url: string | null // Cloudinary secure_url (authenticated delivery for documents)
  storage: "pending" | "stored" | "failed" | "too_large"
}

export interface Message extends Scoped {
  _id: MessageId
  conversationId: ConversationId
  contactId: ContactId
  phoneNumberId: string
  direction: "in" | "out"
  waMessageId: string | null // wamid; unique per workspace when present
  type: WaMessageType
  text: string | null // inbound body, or the OutboundText that was sent
  media: MediaRef | null
  template: { name: string; language: WaLanguage; params: string[] } | null
  interactive: { kind: "button_reply" | "list_reply"; id: string; title: string } | null
  location: { lat: number; lng: number; name?: string; address?: string } | null
  contextWaMessageId: string | null // reply-to
  /** Inbound type="unsupported": the type Meta reported (or the unknown type string) — never dropped silently. */
  unsupported?: { originalType: string; errorCode: number | null } | null
  /** Inbound ingest bookkeeping: true once this message's unread/preview update reached its conversation. */
  inboxApplied?: boolean
  /** Inbound ingest: claim marker for the inbox step (stale after the event lease). */
  inboxClaimAt?: Date | null
  status: DeliveryStatus | null // outbound only
  statusRank: number
  statusAt: Partial<Record<DeliveryStatus, Date>>
  error: { code: number; title: string; detail?: string } | null
  /** Outbound only: set just before the Graph call. Lease-expiry with this set and no wamid = "unknown", never auto-resent. */
  sendAttemptedAt: Date | null
  author:
    | { kind: "customer" }
    | { kind: "user"; user: UserRef }
    | { kind: "automation"; rule: "auto_ack" | "business_hours" | "reminder" }
    | { kind: "broadcast"; broadcastId: BroadcastId }
    | { kind: "system" }
  idempotencyKey: string | null // outbound: unique per workspace when present
  /** Outbound: request id of the API call / webhook run that sent it (logs + audit carry the same id). */
  sendRequestId?: string | null
  waTimestamp: Date | null
  createdAt: Date
}

export type WaEventKind = "message" | "status" | "other"
/** Raw webhook store. Acts as its own processing queue (QueueFields). */
export interface WaEvent extends Scoped, QueueFields {
  _id: string
  /** "msg:<wamid>" | "st:<wamid>:<status>" | "raw:<sha256(body)>" — unique per workspace. */
  dedupeKey: string
  kind: WaEventKind
  phoneNumberId: string | null
  allowed: boolean // phone_number_id ∈ allow-list; disallowed rows get expireAt = now+30d at insert, never processed
  receivedAt: Date
  payload: Record<string, unknown> // the single change.value slice, not the whole batch
  // kind "status" whose wamid is not yet in crm_messages → retryable (pending + backoff), never dropped.
}

export interface WaTemplate extends Scoped {
  _id: string
  name: string
  /** Meta language code; en_US | hi for the fogging templates (other codes are stored as returned). */
  language: WaLanguage
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION"
  /** As returned by Graph; "DISABLED" is also set when a full sync no longer returns the template. */
  status: "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED"
  components: Record<string, unknown>[] // as returned by Graph
  bodyParamCount: number
  hasOptOutButton: boolean
  syncedAt: Date
  /** Step 5 sync extras (lib/crm/outbound/templates.ts). */
  metaId?: string | null
  bodyText?: string
  headerType?: "NONE" | "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION"
  parameterFormat?: "POSITIONAL" | "NAMED"
  removedFromMeta?: boolean
}

/**
 * Business-initiated sends (template outside window), for the per-number tier cap.
 * Written BEFORE the Graph call (a failed send over-counts, never under-counts).
 * UNVERIFIED: Meta may apply messaging limits per business portfolio rather than per number,
 * and tier sizes may have changed. Owner confirms in WhatsApp Manager; tierCap is owner-edited.
 */
export interface SendLedgerEntry extends Scoped {
  _id: string
  phoneNumberId: string
  recipient: PhoneE164
  sentAt: Date
  expireAt: Date // sentAt + 48h (TTL)
}

/** meta_131050: a send failed with Meta 131050 ("user stopped marketing messages", DATA_MODEL §5). */
export type OptOutVia = "stop_keyword" | "stop_button" | "manual" | "meta_131050"
export interface OptOut extends Scoped {
  _id: string
  phoneE164: PhoneE164 // unique per workspace; survives contact deletion/merge ("forever")
  scope: "marketing"
  via: OptOutVia
  at: Date
  by: UserRef | null
  sourceMessageId: MessageId | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Quotations + counters
// ─────────────────────────────────────────────────────────────────────────────

export interface QuotationLine {
  productSlug: string | null
  model: string
  description: string
  hsn: string | null
  qty: number
  unitPrice: Paise
  gstRate: GstRate
  taxable: Paise // qty * unitPrice
  gst: Paise
  lineTotal: Paise
}

export interface Quotation extends Scoped, Timestamps {
  _id: QuotationId
  contactId: ContactId
  dealId: DealId
  status: "draft" | "issued" | "superseded" // issued/superseded are never deleted (gapless numbering)
  /** Allocated at issue from crm_counters ("100X/QT/2026-27/0001"); null while draft. */
  quoteNumber: string | null
  version: number // 1..n; a revision = new doc, same quoteNumber, version+1
  lines: QuotationLine[]
  totals: { taxable: Paise; gst: Paise; grandTotal: Paise }
  terms: { validityDays: number; payment: string; delivery: string; warranty: string; freight: string; notes: string }
  /**
   * Issued PDF metadata. STEP 6 stores the bytes in crm_quotation_pdfs (storage "db"), not Cloudinary:
   * the only Cloudinary uploader makes public unsigned URLs (owner decision pending), and a quotation
   * is a private, immutable commercial record. cloudinaryPublicId stays null until that changes.
   */
  pdf: { storage: "db"; cloudinaryPublicId: string | null; bytes: number; sha256: string; generatedAt: Date } | null
  sends: { channel: "whatsapp" | "email"; at: Date; by: UserRef; messageId?: MessageId; to: string }[]
  issuedAt: Date | null
  issuedBy: UserRef | null
}

export interface QuotationPdf extends Scoped {
  _id: QuotationId
  data: Uint8Array // Binary
  bytes: number
  sha256: string
  generatedAt: Date
}

export interface Counter extends Scoped {
  _id: string // "<workspace>:<kind>:<fy>" e.g. "fogging:quotation:2026-27"
  kind: "quotation"
  fy: string
  seq: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Tasks + reminder rules
// ─────────────────────────────────────────────────────────────────────────────

export interface Task extends Scoped, Timestamps {
  _id: TaskId
  contactId: ContactId | null
  dealId: DealId | null
  title: string
  dueAt: Date
  assignedTo: UserRef
  status: "open" | "done" | "cancelled"
  doneAt: Date | null
  origin: { kind: "manual"; by: UserRef } | { kind: "rule"; ruleId: RuleId }
  /** Rule tasks: "<ruleId>:<dealId>:<stageEnteredAt|nextFollowUpAt ISO>" — unique, so re-evaluation never duplicates. */
  dedupeKey: string | null
  staffPush: { status: "none" | "queued" | "sent" | "failed"; messageId?: MessageId } // WA template to assignee
}

export type ReminderTrigger = "stage_stale" | "follow_up_due" | "amc_due"
export interface ReminderRule extends Scoped, Timestamps {
  _id: RuleId
  name: string
  active: boolean
  trigger: ReminderTrigger
  stage: Stage | null // stage_stale only
  days: number // stale after N days in stage / N days before AMC
  audience: "assignee" | "customer" // customer ⇒ only deals/contacts with the matching opt-in
  templateName: string | null // WA template (staff push or customer message)
  createdBy: UserRef
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue (generic jobs)
// ─────────────────────────────────────────────────────────────────────────────

export type JobKind =
  | "wa_send" // outbound message retry / deferred send
  | "wa_media_fetch" // inbound media → Cloudinary
  | "staff_push" // task → assignee WA template
  | "customer_reminder"
  | "quotation_pdf"
  | "broadcast_expand" // segment/CSV → crm_broadcast_recipients
  | "reports_rollup" // optional

export interface Job extends Scoped, QueueFields {
  _id: string
  kind: JobKind
  phoneNumberId: string | null // for per-number pause/cap
  payload: Record<string, unknown>
  createdAt: Date
}

// ─────────────────────────────────────────────────────────────────────────────
// Broadcasts, segments
// ─────────────────────────────────────────────────────────────────────────────

export interface SegmentFilter {
  customerTypes?: CustomerType[]
  states?: string[]
  stages?: Stage[]
  closedWonWithinDays?: number // AMC campaigns
  existingDealer?: boolean
  interestTags?: string[]
  leadSources?: LeadSource[]
}

export interface Segment extends Scoped, Timestamps {
  _id: SegmentId
  name: string
  filter: SegmentFilter // re-evaluated at broadcast expand time, never cached
  createdBy: UserRef
}

export type RecipientStatus = DeliveryStatus | "skipped"
export type SkipReason = "opted_out" | "invalid_phone" | "duplicate" | "template_missing_param" | "not_on_whatsapp" | "cancelled" | "team_member"

export interface Broadcast extends Scoped, Timestamps {
  _id: BroadcastId
  name: string
  phoneNumberId: string
  audience: { kind: "segment"; segmentId: SegmentId } | { kind: "csv"; importId: string }
  templateName: string // must be APPROVED in crm_wa_templates at send time
  /** Variable mapping per param index: contact field or literal (literals still become OutboundText). */
  params: ({ from: "contact.name" | "contact.company" | "contact.city" | "csv.column"; column?: string } | { literal: string })[]
  languageMode: "contact_preference" | WaLanguage
  status: "draft" | "scheduled" | "expanding" | "sending" | "paused" | "completed" | "cancelled"
  scheduledAt: Date | null
  counts: Record<"total" | "queued" | "sent" | "delivered" | "read" | "failed" | "skipped" | "replied" | "deferred_cap", number>
  createdBy: UserRef
  startedAt: Date | null
  completedAt: Date | null
}

export interface BroadcastRecipient extends Scoped, QueueFields {
  _id: string
  broadcastId: BroadcastId
  phoneE164: PhoneE164 // unique per (workspace, broadcastId)
  contactId: ContactId | null
  language: WaLanguage
  params: string[] // resolved at expand time
  deliveryStatus: RecipientStatus
  skipReason: SkipReason | null
  messageId: MessageId | null
  waMessageId: string | null
  statusAt: Partial<Record<DeliveryStatus, Date>>
  repliedAt: Date | null
  deferredForCap: number // times pushed back by the tier cap
}

// ─────────────────────────────────────────────────────────────────────────────
// Imports (dealer directory CSV, broadcast CSV) + directory
// ─────────────────────────────────────────────────────────────────────────────

export type ImportRowCategory =
  | "new"
  | "duplicate_existing_contact"
  | "duplicate_existing_dealer"
  | "duplicate_in_batch"
  | "invalid_phone"

export interface ImportBatch extends Scoped, Timestamps {
  _id: string
  kind: "dealer_directory" | "broadcast_audience" | "contacts"
  fileName: string
  columnMap: Record<string, string>
  rows: { raw: Record<string, string>; phoneE164: PhoneE164 | null; category: ImportRowCategory }[]
  status: "previewed" | "confirmed" | "discarded"
  summary: Record<ImportRowCategory, number>
  createdBy: UserRef
  confirmedAt: Date | null
  expireAt: Date | null // previews expire after 7 days; confirmed kept (TTL unset)
}

export interface DealerDirectoryEntry extends Scoped, Timestamps {
  _id: string
  phoneE164: PhoneE164 // unique per workspace
  name: string | null
  company: string | null
  state: string | null
  city: string | null
  importId: string
  extra: Record<string, string>
}

// ─────────────────────────────────────────────────────────────────────────────
// Growth OS interface — sales-invisible (ADR §15)
// ─────────────────────────────────────────────────────────────────────────────

export interface AttributionRecord extends Scoped {
  _id: string
  /** null only between the ingest claim and deal creation (crash-safe; the retry completes it). */
  dealId: DealId | null
  contactId: ContactId | null
  /**
   * The ONLY place the CRM stores the form link. Unique per workspace → idempotent website ingest.
   * The claim row is written for every website lead; click ids/UTM/landingPage are filled only
   * when CRM_GROWTH_OS_SYNC is on.
   */
  submissionId: string | null
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  utm: Partial<Record<"source" | "medium" | "campaign" | "term" | "content", string>>
  landingPage: string | null
  /** Page the form was submitted on (form_page_url, else form_page_path). Toggle-on only: its query string can carry gclid/utm. */
  formPage: string | null
  /**
   * Set when the ingest finished (captured or skipped). Null = claim in progress; a claim still
   * null after 5 min is taken over by a retry. (dealId alone cannot mark completion: u_deal allows
   * one row per deal, so a second form attaching to the same open deal keeps dealId null.)
   */
  completedAt: Date | null
  /** Why a claimed submission produced no lead (e.g. no usable phone). Null when captured. */
  skipReason: "no_phone" | "invalid_phone" | null
  capturedAt: Date
}

export type ConversionKind = "closed_won" | "quotation_sent"
export interface ConversionEvent extends Scoped {
  _id: string
  kind: ConversionKind // closed_won = primary, quotation_sent = secondary
  dealId: DealId
  /** Google Ads order_id, unique per workspace: "<dealId>:won" | "<quoteNumber>:v<version>". */
  orderId: string
  value: Paise
  currency: "INR"
  conversionAt: Date // exported as "yyyy-MM-dd HH:mm:ss+05:30"
  gclid: string | null
  gbraid: string | null
  wbraid: string | null
  hasClickId: boolean
  exports: { batchId: string; at: Date; by: UserRef }[]
  createdAt: Date
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings, locks, audit, legacy refs
// ─────────────────────────────────────────────────────────────────────────────

export interface CrmSettings extends Scoped {
  _id: string // = workspace
  businessHours: { tz: "Asia/Kolkata"; days: number[]; open: string; close: string } // "09:30","18:30"
  autoAck: { enabled: boolean; templateName: string | null; text: string | null }
  afterHoursReply: { enabled: boolean; text: string; minIntervalHours: number }
  keywordRules: { keyword: string; field: "customerType" | "interestTag"; value: string }[]
  stopKeywords: string[] // ["STOP","UNSUBSCRIBE","STOP PROMOTIONS", ...]
  repeatEnquiryQuietDays: number // inbound after a closed deal opens a Repeat Enquiry only after N days
  staff: { userId: UserId; name: string; waE164: PhoneE164 | null; pushTasks: boolean }[]
  updatedAt: Date
  updatedBy: UserRef | null
}

export interface Lock extends Scoped {
  _id: string // "<workspace>:chunk:<phoneNumberId>" — one chunk loop per number at a time
  /** Renew/release only with filter {_id, owner}: a run whose lease expired cannot drop a newer run's lock. */
  owner: string
  leaseUntil: Date
}

export interface LegacyRef {
  collection: (typeof LEGACY_COLL)[keyof typeof LEGACY_COLL]
  id: string
}

export interface AuditEntry extends Scoped {
  _id: string
  at: Date
  actor: UserRef | { system: string }
  action: string // "deal.stage_change" | "broadcast.send" | "settings.edit" | "export.conversions" ...
  targetType: string
  targetId: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ip: string | null
  userAgent: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// RBAC — proposed crm.* keys (added to lib/rbac/permissions.ts in step 3)
// ─────────────────────────────────────────────────────────────────────────────

export const CRM_PERMISSIONS = [
  "crm.view",
  "crm.leads.view_all",
  "crm.leads.view_assigned",
  "crm.leads.create",
  "crm.leads.edit",
  "crm.leads.assign",
  "crm.leads.close", // set Closed-Won / Closed-Lost
  "crm.leads.export",
  "crm.leads.merge",
  "crm.inbox.view",
  "crm.inbox.reply",
  "crm.notes.view",
  "crm.notes.create",
  "crm.quotes.create",
  "crm.quotes.send",
  "crm.tasks.manage",
  "crm.broadcasts.view",
  "crm.broadcasts.send", // critical
  "crm.import.run",
  "crm.reports.view",
  "crm.settings.edit", // rules, templates sync, numbers, business hours, tier cap
  "crm.audit.view",
  "crm.growth.export", // critical: conversions CSV + Customer Match CSV + attribution view
] as const
export type CrmPermission = (typeof CRM_PERMISSIONS)[number]

/** Proposed mapping. Design only — live rbac_role_permissions rows are not changed here. */
export const CRM_ROLE_MAPPING: Record<"owner" | "sales" | "operations", { rbacRole: string; permissions: readonly CrmPermission[] }> = {
  owner: { rbacRole: "super_admin", permissions: CRM_PERMISSIONS },
  sales: {
    rbacRole: "sales_executive (assigned only) / sales_manager (all leads)",
    permissions: [
      "crm.view", "crm.leads.view_assigned", "crm.leads.create", "crm.leads.edit", "crm.leads.close",
      "crm.inbox.view", "crm.inbox.reply", "crm.notes.view", "crm.notes.create",
      "crm.quotes.create", "crm.quotes.send", "crm.tasks.manage", "crm.reports.view",
    ],
  },
  operations: {
    rbacRole: "operations (NEW role slug, to be seeded with owner OK)",
    permissions: [
      "crm.view", "crm.leads.view_all", "crm.leads.edit", "crm.inbox.view", "crm.inbox.reply",
      "crm.notes.view", "crm.notes.create", "crm.tasks.manage",
    ],
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Index specs (data). Applied idempotently by lib/crm/db.ts ensureIndexes() (step 3).
// Every non-TTL index leads with `workspace`.
// ─────────────────────────────────────────────────────────────────────────────

export interface IndexSpec {
  collection: CollectionName
  key: Record<string, 1 | -1 | "text">
  name: string
  unique?: boolean
  partialFilterExpression?: Record<string, unknown>
  expireAfterSeconds?: number
  /**
   * Text indexes only. MongoDB treats a document field named `language` as the per-document text
   * language and rejects unknown values (error 17262) — contacts store `language: "en_US"`, so the
   * contacts text index must point the override at a field that is never written.
   */
  languageOverride?: string
}

const W = { workspace: 1 } as const
const exists = (f: string) => ({ [f]: { $type: "string" } })

export const INDEX_SPECS: readonly IndexSpec[] = [
  // contacts
  { collection: COLL.contacts, name: "u_phone", key: { ...W, phoneE164: 1 }, unique: true },
  { collection: COLL.contacts, name: "altPhones", key: { ...W, altPhones: 1 } },
  { collection: COLL.contacts, name: "assignee_activity", key: { ...W, "assignedTo.userId": 1, lastActivityAt: -1 } },
  { collection: COLL.contacts, name: "u_legacy", key: { ...W, "origin.legacyRef.collection": 1, "origin.legacyRef.id": 1 }, unique: true, partialFilterExpression: exists("origin.legacyRef.id") },
  { collection: COLL.contacts, name: "text_name", key: { workspace: 1, name: "text", company: "text", waProfileName: "text" }, languageOverride: "textSearchLanguage" },
  // deals
  { collection: COLL.deals, name: "u_open_per_contact", key: { ...W, contactId: 1 }, unique: true, partialFilterExpression: { isOpen: true } },
  { collection: COLL.deals, name: "contact_created", key: { ...W, contactId: 1, createdAt: -1 } },
  { collection: COLL.deals, name: "stage_entered", key: { ...W, stage: 1, stageEnteredAt: 1 } },
  { collection: COLL.deals, name: "assignee_stage", key: { ...W, "assignedTo.userId": 1, isOpen: 1, stage: 1 } },
  { collection: COLL.deals, name: "followup", key: { ...W, nextFollowUpAt: 1 }, partialFilterExpression: { isOpen: true } },
  { collection: COLL.deals, name: "reports_source", key: { ...W, createdAt: -1, leadSource: 1 } },
  { collection: COLL.deals, name: "closed_at", key: { ...W, contactId: 1, closedAt: -1 }, partialFilterExpression: { isOpen: false } },
  { collection: COLL.deals, name: "reports_closed", key: { ...W, closedAt: -1, stage: 1 }, partialFilterExpression: { isOpen: false } },
  { collection: COLL.deals, name: "u_legacy", key: { ...W, "origin.legacyRef.collection": 1, "origin.legacyRef.id": 1 }, unique: true, partialFilterExpression: exists("origin.legacyRef.id") },
  // timeline + notes
  { collection: COLL.activities, name: "contact_at", key: { ...W, contactId: 1, at: -1 } },
  { collection: COLL.internalNotes, name: "contact_at", key: { ...W, contactId: 1, at: -1 } },
  { collection: COLL.internalNotes, name: "hash", key: { ...W, contactId: 1, textHash: 1 } },
  // conversations + messages
  { collection: COLL.conversations, name: "u_thread", key: { ...W, phoneNumberId: 1, waId: 1 }, unique: true },
  { collection: COLL.conversations, name: "inbox", key: { ...W, status: 1, hasUnread: -1, lastMessageAt: -1 } },
  { collection: COLL.conversations, name: "inbox_assignee", key: { ...W, "assignedTo.userId": 1, status: 1, hasUnread: -1, lastMessageAt: -1 } },
  { collection: COLL.conversations, name: "contact", key: { ...W, contactId: 1 } },
  // inbox polling validator (ETag / since): newest change first
  { collection: COLL.conversations, name: "updated", key: { ...W, updatedAt: -1 } },
  { collection: COLL.messages, name: "u_wamid", key: { ...W, waMessageId: 1 }, unique: true, partialFilterExpression: exists("waMessageId") },
  { collection: COLL.messages, name: "u_idem", key: { ...W, idempotencyKey: 1 }, unique: true, partialFilterExpression: exists("idempotencyKey") },
  { collection: COLL.messages, name: "thread", key: { ...W, conversationId: 1, createdAt: -1 } },
  { collection: COLL.messages, name: "contact_timeline", key: { ...W, contactId: 1, createdAt: -1 } },
  { collection: COLL.messages, name: "last_send", key: { ...W, phoneNumberId: 1, direction: 1, createdAt: -1 } },
  // webhook raw store (also a queue)
  { collection: COLL.waEvents, name: "u_dedupe", key: { ...W, dedupeKey: 1 }, unique: true },
  { collection: COLL.waEvents, name: "due", key: { ...W, status: 1, nextAttemptAt: 1 } },
  { collection: COLL.waEvents, name: "ttl", key: { expireAt: 1 }, expireAfterSeconds: 0 }, // 30 d after processed
  { collection: COLL.waNumbers, name: "u_pnid", key: { ...W, phoneNumberId: 1 }, unique: true },
  { collection: COLL.waTemplates, name: "u_name_lang", key: { ...W, name: 1, language: 1 }, unique: true },
  { collection: COLL.sendLedger, name: "cap_window", key: { ...W, phoneNumberId: 1, sentAt: -1, recipient: 1 } },
  { collection: COLL.sendLedger, name: "ttl", key: { expireAt: 1 }, expireAfterSeconds: 0 },
  { collection: COLL.optOuts, name: "u_phone", key: { ...W, phoneE164: 1 }, unique: true },
  // quotations + counters
  { collection: COLL.quotations, name: "u_number_version", key: { ...W, quoteNumber: 1, version: 1 }, unique: true, partialFilterExpression: exists("quoteNumber") },
  { collection: COLL.quotations, name: "deal", key: { ...W, dealId: 1, createdAt: -1 } },
  // tasks + rules
  { collection: COLL.tasks, name: "assignee_due", key: { ...W, "assignedTo.userId": 1, status: 1, dueAt: 1 } },
  { collection: COLL.tasks, name: "u_dedupe", key: { ...W, dedupeKey: 1 }, unique: true, partialFilterExpression: exists("dedupeKey") },
  { collection: COLL.reminderRules, name: "active", key: { ...W, active: 1, trigger: 1 } },
  // queue
  { collection: COLL.jobs, name: "due", key: { ...W, status: 1, nextAttemptAt: 1 } },
  { collection: COLL.jobs, name: "u_idem", key: { ...W, idempotencyKey: 1 }, unique: true, partialFilterExpression: exists("idempotencyKey") },
  { collection: COLL.jobs, name: "ttl", key: { expireAt: 1 }, expireAfterSeconds: 0 }, // done: 30 d; dead kept (no expireAt)
  // broadcasts
  { collection: COLL.broadcasts, name: "status", key: { ...W, status: 1, scheduledAt: 1 } },
  { collection: COLL.broadcastRecipients, name: "u_recipient", key: { ...W, broadcastId: 1, phoneE164: 1 }, unique: true },
  { collection: COLL.broadcastRecipients, name: "due", key: { ...W, status: 1, nextAttemptAt: 1 } },
  { collection: COLL.broadcastRecipients, name: "wamid", key: { ...W, waMessageId: 1 }, partialFilterExpression: exists("waMessageId") },
  { collection: COLL.broadcastRecipients, name: "reply_attrib", key: { ...W, phoneE164: 1, "statusAt.sent": -1 } },
  { collection: COLL.segments, name: "name", key: { ...W, name: 1 } },
  // imports + directory
  { collection: COLL.dealerDirectory, name: "u_phone", key: { ...W, phoneE164: 1 }, unique: true },
  { collection: COLL.imports, name: "ttl", key: { expireAt: 1 }, expireAfterSeconds: 0 },
  // growth interface
  { collection: COLL.attribution, name: "u_deal", key: { ...W, dealId: 1 }, unique: true, partialFilterExpression: { dealId: { $type: "objectId" } } },
  { collection: COLL.attribution, name: "u_submission", key: { ...W, submissionId: 1 }, unique: true, partialFilterExpression: exists("submissionId") },
  { collection: COLL.conversionEvents, name: "u_order", key: { ...W, orderId: 1 }, unique: true },
  { collection: COLL.conversionEvents, name: "export", key: { ...W, kind: 1, conversionAt: -1 } },
  // audit
  { collection: COLL.audit, name: "at", key: { ...W, at: -1 } },
  { collection: COLL.audit, name: "target", key: { ...W, targetType: 1, targetId: 1, at: -1 } },
  { collection: COLL.audit, name: "actor", key: { ...W, "actor.userId": 1, at: -1 } },
]

// ─────────────────────────────────────────────────────────────────────────────
// Tunables (defaults; env or crm_settings may override in step 3)
// ─────────────────────────────────────────────────────────────────────────────

export const CRM_DEFAULTS = {
  customerServiceWindowMs: 24 * 60 * 60 * 1000,
  windowSafetyMarginMs: 10 * 60 * 1000, // free-form blocked in the last 10 min of the window
  jobLeaseMs: 60_000,
  jobMaxAttempts: 6,
  jobBackoffBaseMs: 30_000, // 30s, 2m, 8m, 32m, then capped
  jobBackoffCapMs: 60 * 60 * 1000,
  // Vercel HOBBY (owner-confirmed 2026-10-10): 1 cron/day, maxDuration 300 s.
  chunkTimeBudgetMs: 180_000, // stop claiming work after 180 s; leaves headroom under 300 s
  chunkBatchSize: 25, // items leased per claim round
  dailyCronUtc: "30 2 * * *", // ≈08:00 IST, imprecise within the hour on Hobby
  lazyReminderEvalMinIntervalMs: 15 * 60 * 1000, // dashboard-load evaluation at most every 15 min
  initialTierCap: 250,
  waEventRetentionDays: 30,
  inboxPollMs: 30_000, // only while the tab is visible; paused when hidden
  staleEventSweepLimit: 5, // pending wa_events re-processed per webhook after() / inbox poll
  jobRetentionDays: 30,
  importPreviewTtlDays: 7,
  sendLedgerTtlHours: 48,
  repeatEnquiryQuietDays: 3,
} as const

/** Env toggles (read in lib/crm/config.ts, step 3). Values are trimmed; "0|false|off" = off. */
export const CRM_ENV = {
  growthSync: "CRM_GROWTH_OS_SYNC", // default ON
  websiteIngest: "CRM_WEBSITE_INGEST", // kill switch, default OFF; only trimmed "on" | "1" | "true" enables website → CRM ingest
  mongoDb: "CRM_MONGODB_DB", // staging DB name; unset = DB from MONGODB_URI
  prodDbName: "CRM_PROD_DB_NAME", // guard: non-production must not resolve to this name
  allowProdDb: "CRM_ALLOW_PROD_DB", // "1" = local dev may deliberately use the prod DB
  publicBaseUrl: "CRM_PUBLIC_BASE_URL", // self-invoke target for the chunk loop; never derived from Host
  previewBypass: "VERCEL_AUTOMATION_BYPASS_SECRET", // Vercel-provided when Protection Bypass for Automation is on
  healthSecret: "CRON_SECRET", // /health accepts it only as an Authorization: Bearer header, never a query param
  waPhoneNumberIds: "CRM_WA_PHONE_NUMBER_IDS", // comma list, allow-list
  waAppSecret: "CRM_WA_APP_SECRET",
  waVerifyToken: "CRM_WA_VERIFY_TOKEN",
  waAccessToken: "CRM_WA_ACCESS_TOKEN",
  waApiVersion: "CRM_WA_API_VERSION",
  waWabaId: "CRM_WA_WABA_ID", // fogging WABA id: GET /{WABA}/message_templates (template sync)
  // Self-continuing chunk loop re-invokes itself with an HMAC header signed by the existing
  // CRON_SECRET (lib/rbac/cron.ts) — no new secret.
} as const
