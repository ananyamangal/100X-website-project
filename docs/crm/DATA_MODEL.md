# CRM + WhatsApp Inbox — Data Model (step 2, 2026-10-10)

Types, enums, collection names and index specs live in `lib/crm/model.ts`; this document is the prose half and the two must agree. ADRs: `docs/DECISIONS.md` §11–§18.

Conventions:
- Native MongoDB driver, 100X Mongo (ADR §11). Every document carries `workspace: "fogging"`, and all access goes through the scoped wrapper `lib/crm/db.ts` (ADR §12).
- `_id` and references (`contactId`, `dealId`, …) are stored as ObjectId and exposed to clients as hex strings. Dates are BSON `Date`; this deliberately differs from the legacy CRM's ISO strings. Money is **integer paise**.
- `UserRef = { userId, name }` refers to `rbac_users`. The name is denormalised at write time.
- "Sales-invisible" means no route under `/api/crm/*` that a Sales or Operations role can reach ever reads the field or collection. Only `lib/crm/growth/**` (behind `crm.growth.export`), the website ingest `lib/crm/website.ts` (writes `crm_attribution`) and the conversion writer `lib/crm/conversions.ts` (reads `crm_attribution`, writes `crm_conversion_events`) may touch it.
- **(R)** marks a required field.

---

## 1. Collections

None of these names collide with the legacy `crm_dealers` / `crm_opportunities` (§9).

### 1.1 `crm_contacts`: one per customer
- **Purpose:** the customer record. The key is the E.164 mobile. A mobile search returns the contact and, through `contactId`, every deal, message, activity, quotation, task and note.
- **Fields:**
  - `phoneE164` (R, unique), `waId` (R, = E.164 without `+`), `phoneKind` (`mobile` | `unverified_mobile` | `international`), `notOnWhatsApp` (set by a 131026 send failure), `altPhones[]`
  - `name`, `waProfileName`, `company`, `customerType`, `state`, `city`, `email`
  - `language` (`en_US` | `hi`, default `en_US`), `interestTags[]`
  - `suggestions[]` (keyword tags waiting for a human to confirm)
  - `existingDealer {directoryId, matchedAt} | null`, `assignedTo`
  - `marketingOptOut`: a mirror of `crm_optouts`
  - `amcDueAt`, `lastActivityAt`, `origin {channel, legacyRef?}`, `mergedInto`, `createdBy`, timestamps
  - There is **no `submissionId`** on the contact or deal. The form link lives only in `crm_attribution` (§1.20), which is sales-invisible.
- **Indexes:**
  - `u_phone {workspace, phoneE164}` UNIQUE
  - `altPhones`
  - `assignee_activity`
  - `u_legacy` UNIQUE partial (`origin.legacyRef.id` exists)
  - text on `name/company/waProfileName`
- **Projection:** every field reaches Sales and Ops. What the form said reaches them through the whitelisted `web_form` activity (§1.3), never as a link to the raw submission row.
- **Retention:** kept forever. A merge sets `mergedInto` and is never a hard delete.

### 1.2 `crm_deals`: one per enquiry
- **Purpose:** the pipeline unit. At most **one open deal per contact** (ADR §13).
- **Fields:**
  - `contactId` (R), `stage` (R), `stageEnteredAt` (R), `stageHistory[] {from,to,at,by,note}` (R, append-only)
  - `isOpen` (R; derived from stage), `isRepeat`, `leadSource` (R)
  - `customerType`: a snapshot of the contact's value, synced while the deal is open
  - `assignedTo`, `productInterest[] {productSlug?, label, qty?}`, `intent {wantsQuote, wantsDealer}`
  - `state`, `city`, `nextFollowUpAt`, `lastQuotation {…}`
  - `closedAt`: equals `won.wonAt` or `lost.lostAt`; null while the deal is open
  - `won {invoiceNumber, invoiceAmountText, orderValue, wonAt}`
  - `lost {reason, text, lostAt}`
  - `customerReminders {quoteFollowUp, serviceAmc}`: default false (opt-in)
  - `origin {channel, conversationId?, firstMessageId?, legacyRef?}`, `createdBy`, timestamps
- **Indexes:**
  - `u_open_per_contact {workspace, contactId}` UNIQUE partial `{isOpen:true}`
  - `contact_created`
  - `stage_entered`: stale-stage rules
  - `assignee_stage`
  - `followup`: partial on open deals
  - `reports_source`
  - `closed_at {workspace, contactId, closedAt:-1}` and `reports_closed {workspace, closedAt:-1, stage}`, both partial on `isOpen:false`
  - Website-ingest idempotency comes from `crm_attribution.u_submission` (§1.20), not from the deal.
  - `u_legacy` UNIQUE partial
- **Projection:** every field reaches Sales/Ops. Invoice is free text, because invoicing stays in Busy. **Attribution and the submission link are not on this document** (§1.20).
- **Creating a deal is race-safe.** Two creators can race, for example a webhook and a website form for the same phone. The loser gets E11000 on `u_open_per_contact`, re-reads the open deal and attaches its activity there. It never retries the insert as a second deal.

### 1.3 `crm_activities`: customer timeline
- **Purpose:** append-only record of interactions that are not WhatsApp messages:
  - `call_log`, `web_form`, `stage_change`, `assignment`
  - `quotation_issued`, `quotation_sent`, `task_done`, `field_change`
  - `existing_dealer_match`, `opt_out`, `merge`
- **Fields:** `contactId` (R), `dealId`, `kind` (R), `at` (R), `by` (R), `summary` (R, ≤200 chars), `data`.
- **The `web_form` `data` is an explicit whitelist** (`WEB_FORM_ACTIVITY_FIELDS`): type, productName, subject, message, company, state, email, intent, wantsQuote, wantsDealer.
  - It never includes `attribution`, `form_page_url` (its query string can carry gclid/utm), the submission `_id`, or any unlisted key.
  - A unit test feeds a submission containing every known key plus junk keys and asserts the exact output key set.
- **Index:** `contact_at`.
- **Timeline API:** `GET /api/crm/contacts/:id/timeline?before=` merge-sorts two indexed queries, `crm_activities` and `crm_messages` (by `contactId, createdAt`), with a shared cursor. Messages are **not** copied into activities, so each fact has a single source.
- **Retention:** forever.

### 1.4 `crm_internal_notes`: private team notes (ADR §14)
- **Fields:** `contactId` (R), `dealId`, `author` (R), `at` (R), `text: InternalNoteText` (R), `textHash` (R; sha256 of lower-cased, whitespace-collapsed text), `editedAt`, `deletedAt` (soft delete).
- **Indexes:** `contact_at`, `hash {workspace, contactId, textHash}`.
- **Projection:**
  - Only `GET /api/crm/contacts/:id/notes` (the Notes tab, `crm.notes.view`) reads note text.
  - The send gate reads `{textHash:1}` only.
  - Notes are never read by the timeline, inbox, conversation preview, broadcast, reminder, automation, AI/flow or export code.
  - The leads CSV export excludes notes and attribution. The brief's `internalNotes[]` is implemented as a collection rather than an embedded array; §6 explains why.

### 1.5 `crm_conversations`: inbox threads
- **Purpose:** one thread per (WA number, customer).
- **Fields:**
  - `contactId` (R), `phoneNumberId` (R), `waId` (R), `status` (`open` | `resolved`)
  - `hasUnread`, `unreadCount`, `lastMessageAt` (R), `lastInboundAt`, `lastOutboundAt`, `lastMessagePreview` (≤120 chars)
  - `assignedTo`, `stage`: denormalised from the open deal so the inbox can filter by stage
  - `autoAckSentAt`, `lastAutoReplyAt`, `resolvedAt/By`
  - `handler` (`human`; `bot` and `ai` are for phase 2), `flow` (phase 2, null)
- **Indexes:**
  - `u_thread {workspace, phoneNumberId, waId}` UNIQUE
  - `inbox {workspace, status, hasUnread:-1, lastMessageAt:-1}`: unread first
  - `inbox_assignee`
  - `contact`
- **`lastInboundAt`** is set from the inbound message's `waTimestamp` using `$max`, so late or out-of-order webhooks cannot move the window backwards.
- **Inbox polling:**
  - `GET /api/crm/inbox?since=<lastMessageAt>` polls **every 30 s while the tab is visible and pauses when it is hidden** (the PR #15 visibility pattern).
  - Each poll also re-processes up to 5 stale `pending` `crm_wa_events` (§1.7).
  - **Hobby budget:** about 4 staff × 8 h × 120 polls/h ≈ 3.9k invocations/day. Each poll is one or two indexed queries at roughly 20–50 ms of CPU, which comes to under 4 CPU-min/day. That is well inside Hobby limits, but it is an estimate to be checked in Vercel usage after launch.
- **New inbound:** sets `hasUnread`, increments `unreadCount` and reopens a resolved thread.

### 1.6 `crm_messages`
- **Fields:**
  - `conversationId` (R), `contactId` (R), `phoneNumberId` (R), `direction` (R), `waMessageId`, `type` (R)
  - `text`, `media {waMediaId, mime, sha256, filename, caption, bytes, cloudinaryPublicId, url, storage}`
  - `template {name, language, params[]}`, `interactive`, `location`, `contextWaMessageId`
  - outbound only: `status`, `statusRank`, `statusAt{}`, `error`, `sendAttemptedAt`
  - `author` (customer, user, automation, broadcast or system), `idempotencyKey`, `waTimestamp`, `createdAt` (R)
- **Indexes:**
  - `u_wamid {workspace, waMessageId}` UNIQUE partial (string exists): the webhook dedupe backstop
  - `u_idem` UNIQUE partial
  - `thread`, `contact_timeline`
  - `last_send`: used by `/health`
- **Media:**
  - Inbound: GET `/{media-id}` with the bearer token → download (16 MB cap; larger files get `storage:"too_large"`) → `lib/cloudinaryUpload.ts` into folder `crm/fogging/<yyyy-mm>/`. Documents and audio use `resource_type: raw|video` with authenticated delivery.
  - Media is fetched inline in the webhook `after()`. On failure the message is marked `storage:"failed"` and a `wa_media_fetch` job is queued.
  - Meta media ids expire after about 30 days, so a retry after that point is skipped.
- **Logging:** the Meta media URL and the bearer token are **never logged**, and neither is the Cloudinary signed URL. Logs carry only the message id and an error code.
- **Retention:** forever (low volume, ~15 leads/day).

### 1.7 `crm_wa_events`: raw webhook store, also its own processing queue
- **Fields:**
  - `dedupeKey` (R, unique): `msg:<wamid>` | `st:<wamid>:<status>` | `raw:<sha256>`
  - `kind`, `phoneNumberId`, `allowed`, `receivedAt`
  - `payload`: the single `change.value` slice
  - plus the `QueueFields` (§5)
- **Indexes:** `u_dedupe` UNIQUE, `due`, and a TTL on `expireAt`, set to `processedAt + 30 d`. Failed and dead rows keep no `expireAt`.
- **Disallowed numbers:** rows for a `phone_number_id` not on the allow-list get `expireAt = now + 30 d` **at insert**, so they never pile up.
- **Statuses before messages:** a `status` event whose wamid is not yet in `crm_messages` (the send response or row is still in flight) is **retryable**. It goes back to `pending` with backoff and is never dropped. It turns `dead` after `maxAttempts` (about 1 h).
- **Stale sweep:** each webhook `after()` and each inbox poll processes up to 5 `pending` rows past `nextAttemptAt`, in addition to the chunk loop and the daily cron.

### 1.8 `crm_wa_numbers`
- **Purpose:** one row per allow-listed `phone_number_id`.
- **Fields:**
  - `wabaId`, `displayPhone`
  - `tierCap` (R, default 250), `tierCapSafetyMargin`: owner-edited, 250 → 1,000 → 10,000
  - `qualityRating`, `sendingPaused`
  - `/health` fields: `lastWebhookAt`, `lastInboundAt`, `lastSendAt`, `lastSendError`
- **Index:** `u_pnid` UNIQUE.
- **Allow-list:** the env `CRM_WA_PHONE_NUMBER_IDS` is authoritative. A number listed in the env with no row here is accepted and its row is auto-created.

### 1.9 `crm_wa_templates`
- **Purpose:** a cache of Meta-approved templates, synced from Graph `GET /{WABA}/message_templates`.
- **Fields:** `name`, `language`, `category`, `status`, `components`, `bodyParamCount`, `hasOptOutButton`, `syncedAt`.
- **Index:** `u_name_lang` UNIQUE.
- **Send rule:** only `status:"APPROVED"` rows are selectable, and the status is re-checked at send time.

### 1.10 `crm_send_ledger`: tier-cap ledger
- **Purpose:** one row per business-initiated send, meaning a template sent while the recipient's 24h window is closed.
- **Ordering:** the row is written **before** the Graph call. A failed send therefore over-counts the cap and never under-counts it.
- **Fields:** `phoneNumberId`, `recipient`, `sentAt`, `expireAt = sentAt + 48h` (TTL).
- **Index:** `cap_window`.
- **Cap check** (inside the per-number chunk lock, §5):
  - `used24h` = distinct `recipient` where `sentAt > now-24h`
  - A recipient already in that set does not count again.
  - Otherwise send only if `used24h < tierCap - tierCapSafetyMargin`. Staff pushes and quote sends may use the margin; broadcasts may not.
- **Over-cap recipients** are deferred, not failed: `nextAttemptAt` = oldest ledger `sentAt` + 24h, and `deferredForCap++`.
- **Sync-send race:**
  - Synchronous sends (quotation and staff templates outside the window) run outside the chunk lock.
  - They can overlap one chunk round, so the cap can be overshot by at most a handful.
  - `tierCapSafetyMargin` (default 20) absorbs this, because broadcasts stop at `tierCap − margin`.
- **UNVERIFIED (owner to confirm in WhatsApp Manager):** Meta may now apply messaging limits per **business portfolio** rather than per number, and the tier sizes may have changed since 250 / 1,000 / 10,000. `tierCap` is owner-edited, so the design holds either way. With a portfolio-level limit, set the same cap on every number in the portfolio.

### 1.11 `crm_optouts`: "excluded forever"
- **Fields:** `phoneE164` (R, unique), `scope:"marketing"`, `via` (`stop_keyword` | `stop_button` | `manual`), `at`, `by`, `sourceMessageId`.
- **Why a separate collection:** it survives contact merges and deletions, and it also covers CSV-only numbers that never become contacts.
- **Triggers:**
  - inbound text matching `settings.stopKeywords` (trimmed, case-insensitive, whole message)
  - a quick-reply payload `OPT_OUT` from a template's "Stop promotions" button
  - manual flag (`crm.leads.edit`)
- **Effect:**
  - excluded from every broadcast and customer reminder, at expand time **and** again at send time
  - free-form replies inside a customer-opened 24h window are still allowed
- No un-opt-out API in v1.

### 1.12 `crm_quotations` + `crm_counters`
- **Quotation fields:**
  - `contactId` (R), `dealId` (R), `status` (`draft` | `issued` | `superseded`)
  - `quoteNumber` (null while draft), `version` (R)
  - `lines[] {productSlug?, model, description, hsn?, qty, unitPrice, gstRate, taxable, gst, lineTotal}`
  - `totals {taxable, gst, grandTotal}`
  - `terms {validityDays, payment, delivery, warranty, freight, notes}`
  - `pdf {storage, cloudinaryPublicId, bytes, sha256, generatedAt}`. **As built (step 6):** `storage:"db"`, bytes in the private collection `crm_quotation_pdfs` (`_id` = quotation id), served only through `GET /api/crm/quotations/:id/pdf`; `cloudinaryPublicId` stays null. Reason: the only Cloudinary uploader makes public unsigned URLs (owner decision pending), and an issued quotation is a private, immutable record. The PDF is rendered once (at issue, or on first download if that render failed) and never re-rendered.
  - `sends[] {channel, at, by, messageId?, to}`, `issuedAt/By`
- **Quotation indexes:** `u_number_version {workspace, quoteNumber, version}` UNIQUE partial, `deal`.
- **Numbering**:
  - Counter `_id = "fogging:quotation:<FY>"`, where FY runs Apr–Mar in IST and is written like `2026-27`.
  - Allocation happens at **issue**, never at draft. Inside `session.withTransaction(...)`, `findOneAndUpdate({_id},{$inc:{seq:1}},{upsert, returnDocument:"after", session})` runs, then the quotation update to `issued` runs with the number. Atlas is always a replica set, so transactions are available. The wrapper forwards `session`.
  - **Revisions:** inserting version n+1 and flipping version n to `superseded` happen in one transaction.
  - **Issued and superseded quotations are never deleted.** There is no delete route; only drafts can be discarded.
  - Format: `100X/QT/2026-27/0001`.
  - A failed PDF render after issue leaves an issued quotation with `pdf:null` that can be regenerated. The number is never released, so **numbering stays gapless**.
- **Revisions:**
  - A revision is a new document with the same `quoteNumber` and `version+1`. The previous version flips to `superseded` and stays visible.
  - The PDF shows "Rev n" when n > 1.
- **Sending:**
  - The PDF is uploaded to Meta `/{phone-number-id}/media` (buffer) and sent as a `document` message: free-form inside the window, or the utility template `quotation_send` with a document header outside it.
  - Email goes through the existing `lib/email.ts` nodemailer.
  - Each send appends to `sends[]`, writes a `quotation_sent` activity and moves the deal to `quotation_sent` unless it is already at a later stage (§3).
  - It also emits a secondary conversion event (§7).

### 1.13 `crm_tasks` + `crm_reminder_rules`
- **Task fields:**
  - `title` (R), `dueAt` (R), `assignedTo` (R), `status`
  - `contactId`, `dealId`
  - `origin`: manual or `{rule, ruleId}`
  - `dedupeKey`: for rule tasks, `<ruleId>:<dealId>:<stageEnteredAt|nextFollowUpAt ISO>`
  - `staffPush {status, messageId?}`
- **Task indexes:** `assignee_due`, `u_dedupe` UNIQUE partial. The unique key means rule re-evaluation, whether from the cron or lazily, can never duplicate a task.
- **Rule fields:**
  - `name`, `active`
  - `trigger`: `stage_stale` | `follow_up_due` | `amc_due`
  - `stage`, `days`, `audience` (`assignee` | `customer`), `templateName`
- This is the small editable table from the brief: stage, days, template.
- **Customer-audience rules** fire only when the matching `deal.customerReminders.*` is true, the number is not opted out, and the template is approved.
- **As built (step 7):**
  - Evaluator `lib/crm/reminders/evaluate.ts` (budget 200 rows per run); sends via `crm_jobs` (`staff_push`, `customer_reminder`) run by `lib/crm/queue/jobs.ts` through one driver `lib/crm/reminders/drive.ts`. Triggers today: lazily from `GET /api/crm/tasks` (in `after()`, ≤ once per 15 min, `crm_locks` row `<ws>:reminders`) and `POST /api/crm/reminders/run`. **The daily cron (§5 driver 4) is not added yet — it needs owner OK.**
  - No rules are seeded; the editor offers suggested rules.
  - Team members' own WhatsApp numbers live in `crm_settings.staff` (`PUT /api/crm/settings/staff`). Their contact rows carry `staffUserId`; inbound from such a number never opens a deal, so staff never appear as leads.
  - Customer opt-ins and the contact's `amcDueAt` are edited through `PATCH /api/crm/deals/:id/reminders` (works on closed deals, because the AMC opt-in lives on the Closed-Won deal).
  - Template parameters: `fog_team_task` [assignee, task, customer, masked mobile, due IST]; `fog_quote_followup` [name, quotation date, product, number]; `fog_service_reminder` [name, machine = deal product interest, purchase date = won date]. A "last service date" is not modelled yet.

### 1.14 `crm_jobs`: generic queue
- **Fields:** `kind` (`wa_send` | `wa_media_fetch` | `staff_push` | `customer_reminder` | `quotation_pdf` | `broadcast_expand` | `reports_rollup`, the last optional), `phoneNumberId`, `payload`, plus `QueueFields`.
- **Indexes:** `due {workspace, status, nextAttemptAt}`, `u_idem` UNIQUE partial, and TTL `expireAt` (done + 30 d). Dead jobs are kept for review.

### 1.15 `crm_broadcasts` + `crm_broadcast_recipients` + `crm_segments`
- **Broadcast fields:**
  - `name`, `phoneNumberId`
  - `audience`: a segment, or a CSV import
  - `templateName`: approved only
  - `params[]`: each one is a contact field, a CSV column or a literal
  - `languageMode`: the contact's preference, or a fixed `en_US` / `hi`
  - `status`: draft → scheduled → expanding → sending → paused | completed | cancelled
  - `counts {total, queued, sent, delivered, read, failed, skipped, replied, deferred_cap}`: kept by `$inc` on each transition, with an admin "recount" aggregate as the fallback
- **Recipient fields:**
  - one row per phone, which is itself a queue item
  - `phoneE164` (unique per broadcast), `contactId`, `language`, `params[]` resolved at expand time
  - `deliveryStatus`, `skipReason`, `messageId`, `waMessageId`, `statusAt`, `repliedAt`, `deferredForCap`
- **Recipient indexes:** `u_recipient` UNIQUE, `due`, `wamid` partial, `reply_attrib`.
- **Expand:**
  - The segment filter is evaluated fresh, or the CSV rows are taken.
  - Each phone is normalised. Invalid and opted-out numbers become `skipped` with a reason. `unverified_mobile` numbers are attempted; a 131026 failure marks them `not_on_whatsapp`. Duplicates collapse on the unique key.
- **Replies:**
  - Inbound messages always land in the inbox and timeline, as for any inbound.
  - If the sender has a recipient row with `statusAt.sent` in the last 72 h, the latest such row gets `repliedAt` and the campaign's `replied` count goes up by one.
- **Segments:** `name`, `filter {customerTypes, states, stages, closedWonWithinDays, existingDealer, interestTags, leadSources}`.
- **As built (step 9 / 9b):** audiences are a segment or a CSV upload (`POST /api/crm/broadcasts/audiences` → `crm_imports` kind `broadcast_audience`; params may use `csv.column`; CSV-only numbers become plain contacts with origin `import` and no deal; team members' numbers are skipped as `team_member`); merged and staff contacts never included; templates with a media header are not supported for broadcasts; max 10,000 recipients per campaign. Chunk loop `lib/crm/queue/chunk.ts`, trigger `POST /api/crm/queue/run` (added to the middleware's exact self-auth set; session with `crm.broadcasts.send`/`crm.settings.edit`, or the HMAC chunk signature). Campaign counts are "reached at least" counts (a read recipient is also counted as delivered). A delivery/read/failed tick that arrives before the recipient row has its wamid is copied from the message row right after the send (`reconcileRecipient`). Retries use attempt-numbered keys (`bc:<id>:<phone>:a<n>`, `retry:<msgId>:a<n>`) and resend only when every earlier attempt failed definitively (a sent one = done, a still-queued one = unknown outcome, never re-sent). Known limits: campaigns assume ONE allow-listed number (with several, the gate needs the broadcast's number passed through); a captured chunk signature can be replayed within its 5-minute TTL (harmless: lock + send keys).

### 1.16 `crm_dealer_directory` + `crm_imports`
- **Directory:** the 600–700 row fogging dealer CSV.
  - Fields: `phoneE164` (R, unique), `name`, `company`, `state`, `city`, `importId`, `extra`.
  - It is kept apart from contacts, so re-importing never overwrites a contact.
  - Contact creation (any channel) looks up `{phoneE164 ∈ [primary, …alt]}` here. On a match:
    - set `existingDealer`
    - suggest `customerType:"dealer"`
    - write an `existing_dealer_match` activity
  - No second contact is ever created, because the contact key is the phone.
- **Imports:** a preview → confirm flow.
  - Fields: `rows[] {raw, phoneE164, category}`, `columnMap`, `summary`, `status`, `expireAt` (TTL 7 d for previews).
  - Row categories: `new`, `duplicate_existing_contact`, `duplicate_existing_dealer`, `duplicate_in_batch`, `invalid_phone`.
  - Upload is a browser CSV file sent as multipart.

### 1.17 `crm_settings` (one document, `_id = workspace`)
- `businessHours {tz:"Asia/Kolkata", days, open, close}`
- `autoAck {enabled, templateName|text}`
- `afterHoursReply {enabled, text, minIntervalHours}`
- `keywordRules[] {keyword, field, value}`
- `stopKeywords[]`, `repeatEnquiryQuietDays`
- `staff[] {userId, name, waE164, pushTasks}`: the staff WhatsApp numbers for task pushes, stored here so that `rbac_users` is not touched

### 1.18 `crm_locks`
- `_id = "fogging:chunk:<phoneNumberId>"`, `owner`, `leaseUntil`.
- It ensures one chunk loop per number, which keeps the tier-cap count race-free.
- Acquire with `findOneAndUpdate({_id, leaseUntil<now}, {$set}, {upsert})`. A duplicate-key error means the lock is held.

### 1.19 `crm_audit`
- Shape: `at`, `actor`, `action`, `targetType`, `targetId`, `before`, `after` (changed keys only), `ip`, `userAgent`.
- Indexes: `at`, `target`, `actor`.
- Written fire-and-forget, and never fails the request.
- **Covered actions:**
  - stage change, assignment, merge, import confirm, opt-out set
  - broadcast create/send/pause/cancel
  - rule/settings/template-sync/tier-cap edits
  - every export (conversions, Customer Match, leads)
  - quotation issue
  - an outbound blocked by the note tripwire: this row stores the contact, the route and the note `_id`, and **never the note text or the attempted body**
- Retention: forever.

### 1.20 `crm_attribution`: **sales-invisible**
- **Fields:** `dealId` (unique partial; null during the ingest claim, and stays null when the form attached to a deal another row already owns), `contactId`, `submissionId` (unique partial), `gclid`, `gbraid`, `wbraid`, `utm {source, medium, campaign, term, content}`, `landingPage`, `formPage` (form_page_url, else path), `completedAt` (ingest finished; the completion marker), `skipReason` (`no_phone` | `invalid_phone`), `capturedAt`.
- **This is the only place the CRM stores the submission link.** It also provides **idempotency for website ingest**, in four steps:
  1. Insert a claim `{submissionId}`. E11000 means the submission was already ingested, or is being ingested.
  2. Create or attach the deal.
  3. Set `dealId` and `contactId` on the claim.
  4. If a claim exists with `completedAt: null` and is older than 5 min, a retry takes it over (conditional update) and completes it. A submission without a usable phone gets a completed claim with `skipReason` and no lead.
- **The claim row is written for every website lead.** Click ids, UTM, `landingPage` and `formPage` are filled only when `CRM_GROWTH_OS_SYNC` is on.
- **Write path:** website ingest only. The values are copied from `submissions.attribution`, which `sanitizeAttribution` already whitelists, including gbraid and wbraid; `lib/gtm.ts` already persists them for 30 days in localStorage.
- **Read path:** only `lib/crm/growth/**`, `lib/crm/website.ts` (its own claim) and `lib/crm/conversions.ts` (click ids for events).

### 1.21 `crm_conversion_events`: **sales-invisible**, the Growth OS interface
- **Fields:**
  - `kind` (`closed_won` primary | `quotation_sent` secondary), `dealId`
  - `orderId` (R, unique): `<dealId>:won` | `<quoteNumber>:v<version>`
  - `value` (paise), `currency:"INR"`, `conversionAt`
  - `gclid`, `gbraid`, `wbraid`, `hasClickId`
  - `exports[] {batchId, at, by}`
- **Indexes:** `u_order` UNIQUE, `export`.
- **Behaviour:** see §7.

---

## 2. Phone normalisation (`lib/crm/phone.ts`)

**Two entry points.** Webhook ids are trusted; human and CSV input is not, so the two go through different functions.

- **`fromWaId(wa_id | messages[].from)`** (webhook): returns `"+" + digits` after **only** a length check (8–15 digits, E.164). There is **no India heuristic**, for two reasons:
  - wa_ids from other countries can begin with digits that mimic `91`, `0` or `00`.
  - Some countries have 10-digit national numbers, so a 10-digit wa_id must not be read as an Indian mobile.
  - wa_id is already the full international number, so the identity mapping is the only correct one.
  - `phoneKind` is `mobile` when it starts `+91`, otherwise `international`.
- **`fromHumanInput(text)`** (manual forms, CSV, website forms, legacy rows): uses the India heuristic below.

**Human input → E.164.** Trim the input and drop everything except digits and one leading `+`. Then apply the first rule that matches:

| Input after strip | Rule | Result |
|---|---|---|
| `+91` `0` + 10 digits | Drop the trunk `0` (a common mistake when typing) | as below |
| `+` then 8–15 digits | Keep. If it starts `+91`, the remainder must be 10 digits; it is classified by the 10-digit rules. | as-is |
| `00` + 8–15 digits | Replace `00` with `+` | international |
| 10 digits, first digit 6–9 | Prefix `+91` | mobile |
| 11 digits, starting `0` | Drop the `0`, then re-apply the 10-digit rules | mobile or unverified_mobile |
| 12 digits, starting `91` | Prefix `+` (this is the wa_id form); classify the remaining 10 digits | mobile / unverified_mobile |
| 13 digits, starting `091` | Drop the `0`, then re-apply | mobile |
| 10 digits, first digit 1–5 (STD + number, or a typo) | Prefix `+91`, `phoneKind:"unverified_mobile"`, `waId` set. It is not rejected and not hard-classified: WhatsApp Business also runs on landlines, and a send failure (131026) sets `notOnWhatsApp`. | unverified_mobile |
| anything else | Reject: a form error, or the import category `invalid_phone` | — |

- **Examples:** `98765 43210`, `+91-98765-43210`, `09876543210`, `919876543210` and `0091 98765 43210` all become `+919876543210`.
- **wa_id:** `waId = phoneE164.slice(1)` always, and `fromWaId(waId)` returns the same `phoneE164`.
- **Non-India:** human input with a leading `+` or `00` is stored as given, with `phoneKind:"international"` and a length check only.
- **Match key:** the full E.164 string, for contacts, the directory, opt-outs, the ledger and recipients. A last-10-digits key is not used, because it can collide across countries. Legacy rows go through this same function.
- **Dedupe:**
  - Look up `phoneE164` first, then `altPhones`.
  - A manual "add alternate phone" is rejected when that number is another contact's primary. Merging is then the remedy (`crm.leads.merge`).
- **Tests:** table-driven unit tests for both functions. They cover every row above, the rejects (empty, 9 digits, letters, 16 digits), and for `fromWaId` a 10-digit foreign id and a `1…` (NANP) id, both of which must stay untouched apart from the `+`.

---

## 3. Stage machine

- **Order** (display and funnel): New → Contacted → Requirement Shared → Quotation Sent → Sample Requested → Negotiation → PO Received → Invoice Raised → Payment Received → Dispatched → Closed-Won / Closed-Lost. Repeat Enquiry is an **entry** stage, used for a new deal on a contact that has prior deals.
- **Transitions are permissive:** any stage may move to any other. Only these guards apply:
  - **→ closed_won:** requires `won.invoiceNumber` (non-empty text) and `won.orderValue` (> 0 paise). `invoiceAmountText` is optional. `wonAt = now`.
  - **→ closed_lost:** requires `lost.reason` ∈ `LOST_REASONS`; `lost.text` is required when the reason is `other`.
  - **closed → open stage (reopen):** allowed only while the contact has no other open deal, because of the unique partial index. It clears `won` / `lost` into history (the `stageHistory` entry keeps the old values in `note`).
  - **Automatic moves:** these never move a deal backwards past its current position in the order list. Sending a quotation, for example, does not pull a `po_received` deal back to `quotation_sent`. Manual moves may go anywhere.
- **Every change is one atomic `updateOne`** with filter `{_id, stage: <expected>}`, which gives optimistic concurrency. It sets `stage`, `stageEnteredAt`, `isOpen`, `closedAt` (set on close, cleared on reopen) and `$push stageHistory`. A reopen that hits E11000 on `u_open_per_contact` returns 409 `other_open_deal`. Then it writes a `stage_change` activity, updates `crm_conversations.stage`, writes `crm_audit`, and emits a conversion event for `closed_won` (§7).
- **New-deal rules:**
  - Website form:
    - open deal exists → attach a `web_form` activity, merge `productInterest` and `intent`, no new deal;
    - otherwise → a new deal, `new` (or `repeat_enquiry` if the contact has prior deals).
  - WhatsApp inbound:
    - contact has no deals → a new deal, `new`;
    - contact has an open deal → timeline only;
    - all deals closed and the latest `deal.closedAt` (index `closed_at`) is older than `repeatEnquiryQuietDays` (default 3) → a new `repeat_enquiry` deal;
    - all deals closed more recently → timeline only, so "thanks, received" does not create a deal;
    - a one-click "Open repeat enquiry" button is always available.
  - Manual call entry: the same rules as the website, with `leadSource` from the form.
  - **Contact merge** (`crm.leads.merge`):
    - if both contacts have an open deal, the user must first close one (Closed-Lost `duplicate_or_spam`) or pick which one survives;
    - then deals, conversations, activities, notes and tasks are re-pointed in one transaction;
    - the loser gets `mergedInto`, and its phone joins the winner's `altPhones`.
- **Reports** use aggregates on `crm_deals`:
  - leads by `leadSource` per ISO week/month (`createdAt`, IST)
  - conversion rate = `closed_won` / created, by source and by `customerType`
  - average days = avg(`closedAt − createdAt`) over `closed_won`
  - top lost reasons = `$group lost.reason`

## 4. The 24-hour customer-service window

- `windowOpenUntil = conversation.lastInboundAt + 24h`. Only **inbound customer messages** set `lastInboundAt`; statuses and our own sends do not.
- Free-form sends (text, media, document) are allowed only while `now < windowOpenUntil − 10 min`. The 10-minute safety margin covers clock skew and queue delay.
- Outside the window the composer switches to the template picker, which lists APPROVED templates only. The server re-checks the window at send time and returns 409 `window_closed` if it is closed. The UI never decides this on its own.
- A template sent while the window is closed writes a `crm_send_ledger` row (§1.10). Inside the window, templates are not ledgered.
- `/api/crm/conversations/:id` returns `windowOpenUntil` so the UI can show a countdown.

## 5. Queue model (ADR §16) — Vercel **Hobby**: 1 cron/day, 300 s max duration

**Shared `QueueFields`** (used by `crm_jobs`, `crm_broadcast_recipients` and `crm_wa_events`):
- `status` (`pending` | `leased` | `done` | `failed` | `dead` | `cancelled`)
- `attempts`, `maxAttempts` (6), `nextAttemptAt`, `leaseUntil`, `leaseOwner`
- `lastError {code, message, at, retryable}`, `idempotencyKey?` (unique partial), `doneAt`, `expireAt`

**Claim.** Claim with `findOneAndUpdate`:
- filter `{workspace, $or:[{status:"pending", nextAttemptAt:{$lte:now}}, {status:"leased", leaseUntil:{$lt:now}}]}`, sorted by `nextAttemptAt`
- update: `$set {status:"leased", leaseUntil: now+60s, leaseOwner}` and `$inc {attempts:1}`
- Claims happen one item at a time, in rounds of up to 25. The index is `due`.

**Outcomes:**
- **Success:** `done`, with `expireAt = now + 30 d`.
- **Retryable error** (network, 5xx, Meta 130429 throughput, 131056 pair rate, 131000/131016 temporary): back to `pending`, with `nextAttemptAt = now + min(30 s · 4^(attempts-1), 1 h)`.
- **Permanent error** (e.g. 131026 undeliverable, 131047 window closed, 132xxx template errors, 131050 user stopped marketing, which also writes an opt-out): `failed`.
- **attempts ≥ maxAttempts:** `dead`.
- **Number-level errors** (131048 spam rate limit, 368 policy block): set `crm_wa_numbers.sendingPaused` and pause running broadcasts on that number, so no further sends go out until the owner resumes.

**Idempotency and at-most-once for sends:**
- The message row is inserted first with `idempotencyKey`, e.g. `bc:<broadcastId>:<phone>`, `task:<taskId>:push` or `reply:<clientRequestId>`.
- `sendAttemptedAt` is written immediately **before** the Graph call; the wamid is written after it.
- If a lease expires and the row has `sendAttemptedAt` but no wamid, Meta may already have accepted the send. That item becomes `failed` with error `unknown_outcome` and is shown for a manual decision. It is never auto-resent, because a duplicate marketing message costs money and quality rating.
- Status webhooks matching the wamid later still update it.

**Drivers (Hobby):**
1. **Webhook processing stays inline.**
   - Verify the signature, insert the raw `crm_wa_events` rows, return 200, then process in `after()`.
   - Rows still `pending` (the `after()` crashed or timed out) are swept by the next webhook `after()` or inbox poll (up to 5 per call), the next chunk run, or the daily cron.
2. **Single sends (composer replies, quotation sends) are synchronous** in the request. Only a failure is queued, as a `wa_send` job.
3. **Broadcasts, queued sends and retries use an admin-triggered, self-continuing chunk loop.**
   - Route: `POST /api/crm/queue/run {phoneNumberId}`. It is triggered by "Send broadcast" / "Retry failed" (`crm.broadcasts.send` or `crm.settings.edit`), and by any enqueue through `after()`.
   - Each invocation:
     - acquires `crm_locks fogging:chunk:<pnid>` (60 s lease, renewed per round);
     - claims and processes rounds of 25 items (broadcast recipients first, then jobs, then pending `wa_events`) until **180 s** have elapsed or nothing is due;
     - checks the tier cap (§1.10) under the lock;
     - sends at ≤ 10 msg/s;
     - releases the lock.
   - If due work remains, it re-invokes itself from `after()`:
     - `fetch(CRM_PUBLIC_BASE_URL + "/api/crm/queue/run", {headers: {x-crm-chunk-sig: HMAC(CRON_SECRET, pnid|ts|depth)}})`.
     - The self-URL comes **from env**, never from the Host header.
     - The signature is valid for 5 minutes, and the chain stops at depth 50 per trigger.
   - The parent does **not** await the child's body; it only waits briefly for the response headers.
   - **The child acknowledges with 202 immediately and does its work in `after()`.** Chains therefore never nest function lifetimes.
   - The lock is renewed and released only with the filter `{_id, owner}`. A run whose lease expired cannot release a newer run's lock.
   - **Preview Deployment Protection:** a preview answers the self-call with 401 unless the request carries `x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET`. That variable is provided by Vercel once "Protection Bypass for Automation" is enabled, which is owner action. Without it, the chain cannot continue on staging, so each chunk there is run by clicking "Run queue" again. This is documented for testers; production is unaffected.
   - If the remaining work is only cap-deferred, it stops. The next trigger or the daily cron resumes it.
   - Progress lives in the documents themselves (lease and status), so a killed invocation loses nothing.
4. **One new Vercel cron, `/api/crm/cron/daily`, runs once a day at about 08:00 IST** (`30 2 * * *` UTC; Hobby timing is imprecise within the hour). In one route it:
   - evaluates the reminder rules → tasks plus `staff_push` / `customer_reminder` jobs;
   - sweeps failed or stuck work back into one chunk run per number;
   - expires stale `leased` items;
   - refreshes the template cache.
   It needs owner OK, and `CRON_PATHS` plus `vercel.json` get updated together (`cron-auth.test.mjs`).
5. **Lazy reminder evaluation.** Loading the dashboard task list runs the same idempotent rule evaluator, at most once per 15 min per workspace (gated by a `crm_locks` row), bounded to 200 deals. A missed or late cron therefore heals itself. **Day-level precision is the documented contract** for reminders.

**Fallback (not default; needs owner OK):** a GitHub Actions scheduled workflow calls a `CRON_SECRET`-protected `POST /api/crm/queue/run-all` every 30 min.

**Active-CPU caution:** every driver begins with an indexed `findOne` on the due work and exits within about 50 ms when nothing is due.

## 6. Internal notes: structural separation (ADR §14)

These are three layers of different strength.
- **1. The module rule (a real guarantee).**
  - Notes live in their own collection behind `lib/crm/notes/**`. Only the notes route (`lib/crm/api/notes.ts`) and manual call entry (`lib/crm/leads/manual.ts`, write-only: the call note from the form) import it.
  - No module under `lib/crm/{outbound,broadcast,queue,automation,reminders,growth,ai,flows}/**` (`ai` and `flows` are phase 2) and no inbox/broadcast route may import it, directly or transitively.
  - Code that can send never holds a note value.
- **2. The send gate (a real guarantee).**
  - `lib/crm/outbound/gate.ts` is the single function every Graph call passes through.
  - It hashes the normalised body and each param, then queries `crm_internal_notes` for that contact with projection `{textHash:1}`.
  - On a match it refuses with 422 `matches_internal_note`. The audit row holds the note id and never any text.
  - This catches laundering that types cannot see: `.trim()`, template literals, `String()`, and copy-paste by a human.
- **3. Brands (a lint; they block direct passing only).**
  - Notes are typed `InternalNoteText`, and every outbound signature takes `OutboundText`.
  - `OutboundText` is minted only in `compose.ts`, by `fromComposer(dto)`, `fromTemplateParam(value)`, `fromAutomationSetting()` and `fromPersistedOutbound(messageId | recipientId)`. The last one re-reads text and params already persisted on a message or broadcast-recipient row, for queued retries and broadcast sends.
  - Producers use `NotInternalNote<T>`, so `fromComposer(note.text)` is a compile error.
  - **Known gap:** `fromComposer(note.text.trim())` or `` fromComposer(`${note.text}`) `` type-checks, because the brand is lost. Layers 1 and 2 cover it.

**The test that proves it:**
- **(a) Type test.** `tests/types/crm-outbound.check.ts` is compiled by a small `tsc -p tests/types/tsconfig.json`, whose include list is only `lib/crm/**` and the file itself, so it is cheap on RAM. It contains `// @ts-expect-error` lines for:
  - `sendText(to, note.text)`
  - `sendText(to, "raw")`
  - `fromComposer(note.text)`
  - `sendTemplate(to, t, [note.text])`
  - and one assignment of `InternalNoteText` to `OutboundText`
  If any of those lines stops erroring, tsc fails.
- **(b) Static node:test.**
  - The import graph (transitive) from `lib/crm/{outbound,broadcast,queue,automation,reminders,growth,ai,flows}/**` and `app/api/crm/{inbox,broadcasts,queue,cron}/**` never reaches `lib/crm/notes`.
  - `as OutboundText` appears only in `compose.ts`.
  - Under `lib/crm/{outbound,broadcast,queue}/**` there is no `as any`, `as never`, `as unknown as`, or angle-bracket cast `<X>expr`.
  - Mint functions are never called with explicit type arguments (`fromComposer<`…).
  - `COLL.internalNotes` is referenced only in `lib/crm/notes/**` and `gate.ts`.
- **(c) Runtime test** (mongodb-memory-server):
  - Create a note, then POST through the reply route:
    - its exact text;
    - a case/whitespace variant;
    - a template param;
    - a queued retry built via `fromPersistedOutbound` from a tampered message row.
  - Expect 422 or `failed`, zero Graph calls (fetch stubbed), and one audit row that contains no note text.

**Why a collection, not `contact.internalNotes[]`:** an embedded array is returned by every `findOne(contact)` unless each projection remembers to exclude it. With a separate collection, a forgotten projection cannot leak a note.

## 7. Growth OS interface (ADR §15)

- **Capture:** website ingest always writes the `crm_attribution` claim row (§1.20); when the toggle is on, it also writes the click ids and UTM. WhatsApp and call deals get none, unless the same phone came from a form within 30 days; in that case the click ids are copied into a new row for the new deal with `submissionId: null` (the original claim row keeps the link, so the unique index is unaffected).
- **Events** (toggle on), with an idempotent upsert on `orderId`:
  - on → `closed_won`: `value = won.orderValue`, `conversionAt = wonAt`
  - on each quotation **version first sent**: `quotation_sent`, `value = grandTotal`
  - click ids are copied from `crm_attribution` (the contact's row for this deal, else its latest row with a click id), and `hasClickId` is set; no click id → no event.
  - Implemented as `recordConversionEvent()` in `lib/crm/conversions.ts` (3c). The stage change to `closed_won` (§3, `lib/crm/leads/stage.ts`) calls it (wired in 4c, fire-and-safe). **Done (step 6):** `lib/crm/quotes/send.ts` calls it for `quotation_sent` on the first send of each version; a manual move to the `quotation_sent` stage does not.
- **Exports** (`crm.growth.export`, audited):
  - `GET /api/crm/growth/conversions.csv?kind=&from=&to=`: Google Ads Offline Conversion Import columns `Google Click ID, Conversion Name, Conversion Time, Conversion Value, Conversion Currency, Order ID`. Gbraid and wbraid go in their own columns, in the template variant that supports them. Only rows with a click id are included, and `exports[]` is appended.
  - `GET /api/crm/growth/customer-match.csv?segmentId=`: the `Phone` column is SHA-256 of E.164 including `+`, lower-case hex. Opted-out numbers are excluded.
- **Toggle `CRM_GROWTH_OS_SYNC`** (default ON; `0|false|off`, trimmed, means off): when off there is no capture, no events, and the exports return 409 `{error:"growth_sync_disabled", message}`. Existing rows are kept.
- **Pre-existing leak (report it to the owner; this design does not change it):** `GET /api/submissions` currently returns the full documents, including `attribution`, to any admin session. That is tied to open PR #18 (role gate) and is outside the CRM's scope. Until it is fixed, "sales-invisible" holds for CRM routes only.
- **No code coupling.** Growth OS may *read* `crm_conversion_events` and `crm_contacts` later (its own change, flagged). A static test asserts that `lib/crm/**` never imports `lib/growth-os` and vice versa. (Writing via `createAttributionLead` was rejected: it would need exactly such an import.)

## 8. Ingest paths, webhook, `/health`, RBAC

- **Website:**
  - `app/api/submissions/route.ts` gains one `after(() => ingestWebsiteSubmissionSafely(doc, requestId))` from `lib/crm/website.ts` (core: `captureWebsiteSubmission`). A failure there is logged (request id + submission id, no lead data) and never fails the form; with the CRM env unconfigured or the DB guard refusing it logs one skip line.
  - **Kill switch `CRM_WEBSITE_INGEST`** (default OFF; only trimmed `on` | `1` | `true` enables): when off the hook returns immediately (no DB import, no log), so pushing `main` writes no `crm_*` rows.
  - **Go-live order:** (1) run `scripts/crm/ensure-indexes.mjs` on the target DB (the `u_submission`, `u_deal`, `u_open_per_contact` and `u_order` indexes make ingest idempotent and race-safe); (2) only then set `CRM_WEBSITE_INGEST=on`; (3) optionally replay missed rows with the backfill (dry run first).
  - Phone comes from `fromHumanInput(doc.mobile ?? doc.phone)`.
  - `productInterest` comes from `productName`/`message`, and the `intent` booleans are copied.
  - The ingest is idempotent through `crm_attribution.u_submission` (claim first, §1.20).
  - Only `WEB_FORM_ACTIVITY_FIELDS` are copied into the activity.
  - A backfill script (`scripts/crm/backfill-website-leads.mjs`, dry run by default, `--since`, `--limit`, `--apply`) replays recent submissions through the same function. `/api/rfq-submit` (rows of type `rfq`) has the same `after()` hook, scheduled only after its successful insert.
- **Webhook** `POST /api/crm/whatsapp/webhook`:
  - Read the raw body and verify `X-Hub-Signature-256` with `CRM_WA_APP_SECRET.trim()` using timingSafeEqual; return 401 on mismatch.
  - Split into changes. A `metadata.phone_number_id` that is not allow-listed is stored with `allowed:false` and not processed.
  - `insertMany(ordered:false)` into `crm_wa_events`. Duplicate-key errors are expected and ignored.
  - Return 200, then process in `after()`.
  - `GET` handles the verify-token handshake.
  - Middleware: add `/api/crm/` to `PROTECTED_API_PREFIXES`, exempting `/api/crm/whatsapp/webhook` (signature) and `/api/crm/cron/*` plus `/api/crm/queue/run*` when signed (CRON_SECRET or chunk HMAC).
- **Automation on inbound:**
  - first inbound from a new contact → auto-ack (`conversation.autoAckSentAt`, once);
  - outside business hours → after-hours reply (at most once per `minIntervalHours`);
  - keyword match → `contact.suggestions[]` with status `pending`, which a human confirms;
  - STOP → opt-out.
  - **As built (step 8):** `lib/crm/automation/inbound.ts`, called from `inboundAutomationHook`. Both replies are **off by default** (CRM → Automation). When the after-hours reply and the auto-ack apply to the same message, only the after-hours text is sent and the ack is marked done. Never for staff numbers or STOP/START messages; a suggestion that exists in any state (pending/accepted/rejected) is never re-created. Settings fields add `autoAck.textHi` and `afterHoursReply.textHi`; `autoAck.templateName` is not used (session text only).
- **`/health`** `GET /api/crm/health?workspace=fogging`. Access is a `crm.view` session, or `Authorization: Bearer <CRON_SECRET>` for uptime checks. The secret is accepted only in that header and never as a query parameter. It reports, per number:
  - `lastWebhookAt`, `lastInboundAt`, `lastSendAt`, `lastSendError`
  - `queueDepth` (pending + leased due, across the three queues), `oldestDueAgeSec`, `dead` count
  - `tierUsed24h / tierCap`, `sendingPaused`
- **RBAC:** `CRM_PERMISSIONS` and `CRM_ROLE_MAPPING` in `model.ts`.
  - Owner → `super_admin` with every `crm.*` key.
  - Sales → `sales_executive` (assigned leads) or `sales_manager` (`view_all`).
  - Operations → a new `operations` role slug, seeded only with owner OK.
  - The existing `leads.*`/`dealer.*` keys are left untouched.
  - The 100X JWT embeds permissions at login, so CRM routes re-resolve permissions from the DB per request.
  - No live role rows are changed in this step.
  - **Step 3d status (2026-10-10):** the 23 `crm.*` keys are in `lib/rbac/permissions.ts` (group "Dealer & CRM", subgroup "CRM") and in the code fallback `lib/rbac/roles.ts`: `super_admin` = all; `sales_manager` = Sales set + `crm.leads.view_all`; `sales_executive` = Sales set + `crm.leads.view_assigned` (`CRM_SALES_PERMISSIONS`). `/admin/crm` → `crm.view` in `MODULE_PERMISSIONS`. Live `rbac_role_permissions` rows govern and are **not** changed by code: `scripts/crm/grant-crm-permissions.mjs` (dry run by default; `--offline` prints the intended keys; refuses the prod DB without `--allow-prod` + `CRM_ALLOW_PROD_DB=1`) proposes the per-role diff.
  - **`operations` role: PENDING owner approval.** The slug is not created in `RoleSlug`, `ROLE_PERMISSIONS`, `ROLE_DEFINITIONS` or the grant script. When approved: add the slug, its `CRM_ROLE_MAPPING.operations` keys, a seed row, and decide whether it is a confined role in `lib/rbac/access.ts`.

### 8.1 CRM API (steps 3d, 3e and the 4a/4b reads)

All routes: Node runtime, `force-dynamic`, session cookie (middleware `PROTECTED_API_PREFIXES` covers `/api/crm/`), then `lib/crm/api/auth.ts` `requireCrm()` which **re-resolves permissions from the DB per request** and requires `crm.view` plus the route's keys (401 `unauthorized` / 403 `forbidden` + `required[]` / 503 `permissions_unavailable`, fail closed). Every response carries `x-request-id`; logs carry the request id, ids and counts only. DB access is `crmDb("fogging")`; every mutation writes `crm_audit` through `lib/crm/audit.ts` `logCrmAction()` (never throws; PII keys scrubbed). Handlers live in `lib/crm/api/{leads,contacts,notes,dealers}.ts` (injectable deps for tests); the route files are one-liners.

Lead visibility: `crm.leads.view_all` = every lead; `crm.leads.view_assigned` = deals (or contacts) assigned to the user; neither = 403 on lists, 404 on single records.

| Route | Permission (besides `crm.view`) | Notes |
|---|---|---|
| `GET /api/crm/leads` | view_all \| view_assigned | deals + contact summary; filters `stage, source, customerType, assignee (id \| unassigned), existingDealer, status (open\|closed\|all), q`; `q` = mobile in any format (exact via `fromHumanInput`, plus digit prefix) or name/company/WA name; sort contact `lastActivityAt` desc; `page`, `pageSize ≤ 100`. Whitelisted projections. |
| `POST /api/crm/leads` | `crm.leads.create` (+ `crm.leads.assign` to assign someone else; default assignee = the caller) | manual call entry → `captureLead` (deal policy "always"), dealer-directory flag, `call_log` activity (no note text), product/quantity → `productInterest`; the form's `notes` → `crm_internal_notes`. Returns `{contactId, dealId, created, dealCreated, dealOutcome, existingDealer, noteId}`; 201 when a contact or deal was created. |
| `GET /api/crm/team` | — | assignable users (`lib/rbac/assignable.ts`: active users whose effective permissions include a `crm.leads.view_*` key), `{id, name}` only. |
| `GET /api/crm/contacts/:id` | view_all \| view_assigned | contact + deals (≤ 50) + first timeline page (`?before=&limit=`). **Never notes.** |
| `GET /api/crm/contacts/:id/timeline` | view_all \| view_assigned | next timeline page (cursor `before` = last item's time; items sharing that exact millisecond may be skipped). |
| `GET /api/crm/contacts/:id/notes` | `crm.notes.view` | the only read path for note text. |
| `POST /api/crm/contacts/:id/notes` | `crm.notes.create` | `{text ≤ 4000, dealId?}`; default deal = the open one. |
| `PATCH /api/crm/deals/:id` | `crm.leads.edit` (fields) / `crm.leads.assign` (`assignedTo`) | `assignedTo`, `nextFollowUpAt`, `productInterest[]`, `customerType` (confirms it on the contact and decides pending suggestions). Open deals only (409 `deal_closed`); `stage/won/lost` → 400 `stage_changes_not_supported` (step 4c). Contact-level `rejectSuggestion {kind: customerType\|interestTag, value}` / `acceptSuggestion {kind: interestTag, value}` (adds the tag) need `crm.leads.edit`, also work on a closed deal's contact, answer 404 `suggestion_not_found` when no pending match, and audit kind/value/ids only. |
| `GET /api/crm/dealers` | — | directory list `?q=&state=&page=` (50/page). |
| `POST /api/crm/dealers/import/preview` | `crm.import.run` | multipart `file` (CSV/TSV/TXT ≤ 2 MB, optional `columnMap` JSON) or JSON `{text, fileName?, columnMap?}`; ≤ 10,000 rows; header auto-detect for name, company, mobile, altPhone, state, city, gst, notes; stored in `crm_imports` (TTL 7 d); returns counts per category + the first 1,000 rows. A 400 for an undetected/unknown mapping also returns `headers[]` exactly as parsed (BOM stripped, trimmed). |
| `POST /api/crm/dealers/import/confirm` | `crm.import.run` | `{importId}`; idempotent (a confirmed import returns its stored counts). Inserts `new` + `duplicate_existing_contact` rows; flags every matching contact without `existingDealer` (+ `existing_dealer_match` activity, + pending `customerType: dealer` suggestion). |

Import categories use the model names (`ImportRowCategory`): `new`, `duplicate_in_batch`, `duplicate_existing_dealer` (already in the directory), `duplicate_existing_contact` (a CRM contact's primary or alt phone; still added to the directory), `invalid_phone` (incl. Excel `9.87E+09` values). The alternate phone is kept in `extra.altPhoneE164`; only the primary phone is the directory match key (as in `captureLead`).

Notes module: `lib/crm/notes/index.ts`. Importers: the notes route handler (`lib/crm/api/notes.ts`) and manual call entry (`lib/crm/leads/manual.ts`, write-only). No sending module may import it (§6).

## 9. One-time migration from the legacy CRM

Script `scripts/crm/migrate-legacy.mjs`. It defaults to `--dry-run`; `--apply` requires `--confirm-db=<name>`.
- **Collections:** it reads `crm_dealers` and `crm_opportunities` from the default 100X DB and writes through the scoped wrapper.
- **`crm_dealers` row:**
  - normalise `phone`, then upsert a contact by `phoneE164`, filling only empty fields;
  - `origin.legacyRef = {collection:"crm_dealers", id}`;
  - `gem_status` and `oem_status` become `interestTags`;
  - `notes` becomes a `call_log` activity labelled "migrated note" (not an internal note, because it was team-visible before);
  - `next_followup_at` becomes `deal.nextFollowUpAt`.
- **Legacy `stage` → new stage:** mapped by a table built from `distinct("stage")` during the dry run. Unknown values map to `new`, and the original value is kept in the `stageHistory` note.
- **`crm_opportunities` row:**
  - matched to a contact by phone, otherwise by legacy dealer id;
  - with no phone, it is listed in the report and **not migrated**, so no phoneless contact is invented;
  - `expected_revenue` is kept in the stage note only.
- **Idempotency:** `u_legacy` partial unique indexes make re-runs no-ops.
- **Output:** a JSON report under `reports/` with counts per category, skipped rows and the stage map.
- **Legacy data:** the legacy collections are **never modified or dropped**. `crm_dealers` stays readable for `customer-match-engine` until Growth OS is repointed. Old sidebar entries are hidden after parity, in a separate step.

## 10. Staging DB selection

- `lib/mongodb.ts` builds one client from `MONGODB_URI`, and every caller uses `client.db()`. The DB name therefore comes from the URI path, which is the Atlas default.
- **No change to `lib/mongodb.ts`.** `lib/crm/db.ts` uses `client.db(process.env.CRM_MONGODB_DB?.trim() || undefined)`:
  - The Preview env sets `CRM_MONGODB_DB=100x_crm_staging`, so CRM collections on `crm-staging` previews are isolated.
  - Production leaves it unset, so CRM shares the main DB, where Growth OS can read it.
- **Guard:** every environment sets `CRM_PROD_DB_NAME`. When `VERCEL_ENV !== "production"`, the wrapper throws on first use if the resolved name equals it.
  - Local dev too: `.env.local` is the PROD DB, so local runs need `CRM_MONGODB_DB` or an explicit `CRM_ALLOW_PROD_DB=1`.
- **Caveat:** the *rest* of a preview deployment still uses the preview `MONGODB_URI`, which is UNVERIFIED and possibly prod. In particular, a website form on a preview writes `submissions` there and CRM rows to staging. This is acceptable for CRM staging, and flagged.

## 11. How Phase 2 fits (not built)

- **Button qualification flow:** `conversation.flow {flowId, step, data, expiresAt}` and `handler` already exist. Interactive replies are stored as `message.interactive`. A flow engine would consume `wa_events` before the human inbox and write normal contact/deal fields, so there are no new collections beyond a `crm_flows` definition table.
- **AI agent + handover:** set `handler:"ai"` and give messages `author.kind:"automation"` (with a new `ai` rule). The agent's outbound goes through the same `OutboundText` gate. Handover sets `handler:"human"` and assigns the conversation. Notes stay unreachable from the agent by the same module rule.
- **WhatsApp Web extension:** it uses `GET /api/crm/contacts/lookup?mobile=` (normalised server-side), `GET /api/crm/deals/:id` and `POST /api/crm/deals/:id/stage`. These are the same APIs as the UI, with session or token auth, so nothing in the model changes.
- **Proforma and Cashfree** (PHASE_2): the counter `kind` is extensible (`proforma`), and quotations are copied into proforma documents.
- **A second workspace:** add its id to `WORKSPACES`. The wrapper and indexes already partition by it.
