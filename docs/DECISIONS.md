# ARCHITECTURE DECISIONS — 100X Circle Website
*Generated 2026-06-05. Documents why key choices were made.*

---

## 1. Single MongoDB Connection with Module-Level Singleton

**Decision:** `lib/mongodb.ts` uses a global singleton `_mongoClientPromise` for both dev and production.

**Why:** Vercel serverless functions cold-start per invocation. Without the singleton, each API route would open a new connection and hit MongoDB's connection limit. The global preserves the connection across warm invocations in the same container.

**Alternative rejected:** Mongoose connection management — adds complexity; native driver is sufficient for this data model.

---

## 2. Cookie-Only Admin Auth (No next-auth)

**Decision:** Admin protected by a single `admin-token=authenticated` cookie checked in `app/admin/middleware.ts`. No JWT, no session store, no OAuth for admin login.

**Why:** Single-user admin (one owner). next-auth adds 500+ lines of config and a sessions collection for no benefit at this scale. Cookie set on successful password POST, checked on every admin page/API load.

**Alternative rejected:** next-auth — overkill; JWT with ADMIN_PASSWORD env var check — similar but more complex.

**Risk:** Cookie is not signed. If `ADMIN_PASSWORD` is strong and the site is HTTPS-only (Vercel default), risk is acceptable.

---

## 3. Single Google OAuth Flow for All Three Google Integrations

**Decision:** One OAuth consent → one token stored in `google_oauth_tokens` → used by GSC, GA4, and Ads. Scopes requested together: `webmasters.readonly analytics.readonly adwords`.

**Why:** Three separate OAuth flows would require three separate connections and three token refresh cycles. Users would need to re-auth three times. One consent + one token is simpler and all three scopes are low-risk (read-only for GSC/GA4, read for Ads data).

**Implementation:** `lib/google-oauth.ts` handles token storage and auto-refresh. `lib/gsc.ts`, `lib/ga4.ts`, `lib/google-ads.ts` each call `getValidAccessToken()` from google-oauth — they never touch tokens directly.

**Alternative rejected:** Separate OAuth per product — too much state, too many env vars.

---

## 4. GeM Harvester as Sequential ID Scanner

**Decision:** Scan `https://bidplus.gem.gov.in/bidding/bid/getSinglePacketResultView/{id}` with sequential numeric IDs rather than using GeM's search/filter API.

**Why:** GeM has no public API. The BidPlus detail pages are fully server-rendered HTML — no JavaScript required, no Playwright/browser overhead. Sequential IDs are stable and predictable. Pages 404/200 cleanly.

**Implementation:** Pure Node.js `https` module for the script. Vercel `fetch` for the API route. No external dependencies beyond MongoDB.

**Alternative rejected:** GeM search API (does not exist publicly). Playwright browser automation (too slow, too fragile, expensive on Vercel). GeM's XML feed (incomplete, not real-time).

**ID range reference:** ~1M IDs ≈ 6 months of bids. At 120/day cron rate = ~4 years to scan 1M IDs. Use the local script for bulk backfill.

---

## 5. Growth OS Agent Architecture — DB-Driven, No Queue

**Decision:** Agents are TypeScript functions in `lib/growth-os/agents/`. They're triggered manually (admin UI) or via the automation dispatch in `app/api/admin/growth/automation/route.ts`. No message queue, no background workers.

**Why:** Low frequency (weekly/monthly runs). Vercel Function max duration is 60s per route (agents are designed to complete within this). A queue would add infra complexity (Vercel Queues, Redis) for agents that run once a week.

**All results persist to MongoDB** — agents write to `growth_os_logs`, `growth_os_opportunities`, `growth_os_schema_audit`, `growth_os_link_graph`, `growth_os_citations`. Admin UI reads from these collections.

**Alternative rejected:** Background workers / Vercel Queues — needed only if agents become long-running or need retries. Current agents complete in < 30s.

---

## 6. Cinematic Product Model

**Decision:** Products have extra fields beyond basic catalog: `filmChapters`, `boxContents`, `productFaqs`, `tagline`, `heroVideoUrl`, `problem`, `solution`, `certifications`, `performanceMetrics`, `ugcImages`.

**Why:** Thermal fogging machines are a considered purchase (₹20k–₹2L). Buyers need education, not just specs. The cinematic model supports rich storytelling per product — video chapters, what's in the box, FAQ, UGC deployment images.

**Alternative rejected:** Separate content types — would require joins. Single document per product keeps all data together.

---

## 7. MCP Server as Public Endpoint

**Decision:** `/api/mcp` requires no authentication.

**Why:** MCP tools expose the same data as the public website (product catalog, certifications, company info). There is no private data in scope. Public access allows AI crawlers, Claude.ai, and other LLMs to use it as a data source for brand presence in AI-generated answers.

**Alternative rejected:** Auth-protected MCP — would block all AI agent access; defeats the purpose.

---

## 8. Static AI Knowledge Data

**Decision:** `lib/ai/knowledge.ts` is a static TypeScript file with company/product data hardcoded. Not fetched from MongoDB at runtime.

**Why:** This data changes rarely (certifications, factory address, contact info). Static data means zero DB calls on AI page loads and MCP requests, zero failure surface, and fast cold starts. The file has a `AI_LAST_UPDATED` constant to signal when it was last reviewed.

**Alternative rejected:** Dynamic data from MongoDB — higher latency, extra DB calls, no benefit for data that changes once a quarter.

---

## 9. Ads Data Sync to MongoDB (Not Live API Calls)

**Decision:** Google Ads data is synced to MongoDB collections (`ads_campaign_rows`, etc.) keyed by `syncDate`. Admin UI reads from MongoDB, not from the Google Ads API live.

**Why:** GAQL queries take 2–10 seconds each. Live API calls on each page load would be too slow and would burn API quota. Daily sync is sufficient for campaign monitoring.

**Alternative rejected:** Live GAQL on each request — too slow, quota risk. Caching layer — MongoDB is effectively the cache.

---

## 10. Spare Parts as Separate Collection

**Decision:** `spare_parts` is its own MongoDB collection with a `compatibleProducts` field (array of product IDs).

**Why:** Parts are independently addressable pages with their own SEO value. Government buyers often search for replacement parts — being discoverable for "fogging machine spare parts" is a lead channel. Separate collection allows separate CRUD without polluting the product model.

**Alternative rejected:** Sub-documents inside products — makes it hard to list all parts across all products, hard to give parts their own pages.

---

## 11. CRM Runs Inside 100X With Its Own WhatsApp Webhook (not a workspace on another business's backend)

**Decision:** The fogging CRM + WhatsApp inbox lives in this Next.js app (`lib/crm/*`, `app/api/crm/*`, `/admin/crm/*`) on the 100X MongoDB. The fogging number (new Cloud API number, own WABA) delivers to `https://www.100xcircle.com/api/crm/whatsapp/webhook` via a WABA-level `override_callback_uri` (or a separate Meta app). Inside the handler only allow-listed `phone_number_id`s (`CRM_WA_PHONE_NUMBER_IDS`) are processed; signature uses the subscribed app's secret (`CRM_WA_APP_SECRET`, trimmed).

**Why:** The brief asked for both "a shared Fastify backend on Railway with two workspaces" and "CRM inside 100X, fully separate, never modify the other business's routes/env". These are mutually exclusive: that backend is not Fastify, and its webhook does not route by `phone_number_id`, so every inbound message would reach the other business's bot. Putting fogging on that endpoint would require changes there and risks fogging customers getting the wrong replies. A separate callback needs no changes elsewhere.

**Alternative rejected:** A shared endpoint routing by `phone_number_id` — needs edits to the other backend and forwarding with re-verified signatures; couples two businesses' uptime. Separate Railway service — a third runtime and deploy target for a 3–5 person team.

---

## 12. `workspace` Field + Scoped Collection Wrapper (instead of Mongoose hooks)

**Decision:** Every CRM document carries `workspace` (`"fogging"` today). All CRM data access goes through `lib/crm/db.ts` → `crmDb(workspace).collection(COLL.x)`, a thin wrapper over the native driver that:
- **Filters** (`find`, `findOne`, `countDocuments`, `distinct`, `updateOne/Many`, `deleteOne/Many`, `findOneAndUpdate/Replace/Delete`, `replaceOne`): deep-scans the filter and **throws** if a `workspace` key appears anywhere (incl. inside `$or/$and/$nor/$expr`) with anything other than the scoped string, then ANDs `{workspace}` at the top level.
- **Writes:** `insert*`/`replaceOne`/`findOneAndReplace` set `workspace` and throw if the doc carries a different one. Update documents may not touch `workspace` through any operator (`$set`, `$unset`, `$rename` from *or to* `workspace`, `$inc`, `$min`, `$max`, `$setOnInsert`, `$currentDate`, `$mul`); upserts get `workspace` via the filter. **Pipeline updates** (array form) are scanned stage by stage for `workspace` in `$set/$addFields/$project/$unset/$replaceWith/$replaceRoot`.
- **`bulkWrite`:** every op is checked and scoped individually with the same rules (insertOne, updateOne/Many, replaceOne, deleteOne/Many).
- **`aggregate`:** prepends `{$match:{workspace}}`; throws on `$out`, `$merge`, `$unionWith`, `$graphLookup`, `$changeStream`, `$collStats`, `$currentOp`; recurses into `$facet` branches and `$lookup.pipeline`; a `$lookup` into a `crm_*` collection is allowed only when built by `scopedLookup()` (sub-pipeline starting with the same `$match`, no `localField/foreignField`-only form).
- **Blocked outright:** `estimatedDocumentCount` (cannot be filtered), `watch()`, `drop`, `rename`, raw `collection`/`db` access. Index creation is only via `ensureIndexes(INDEX_SPECS)`.
- **Sessions:** every method accepts and forwards `{session}` (quotation numbering, merges).
- Exposes no raw `Collection`. The only unscoped accessor is a read-only `legacy(LEGACY_COLL.x)` used by the migration script.
- Every non-TTL index leads with `workspace` (`INDEX_SPECS` in `lib/crm/model.ts`).

**Why:** The owner asked for "a Mongoose/Fastify pre-hook that rejects any query without workspace". 100X uses the native driver (§1), which has no middleware hooks; a wrapper gives the same guarantee and is easier to test.

**Proof (tests):** (1) `tests/unit/crm-workspace-scope.test.mjs` on mongodb-memory-server inserts docs for `fogging` and `other` with the raw driver, then via `crmDb("fogging")` asserts that `find({})`, `countDocuments({})`, `distinct`, `updateMany({})`, `deleteMany({})`, `findOneAndUpdate`, `aggregate([])` never return or touch an `other` doc; that `find({workspace:"other"})` and `find({$or:[{workspace:"other"}]})` throw; and that forbidden aggregate stages throw. Also covered: a `bulkWrite` mixing ops with a smuggled `workspace`, `$rename` to `workspace`, `$max/$inc/$setOnInsert` on `workspace`, a pipeline update setting it, a `$facet` branch and a `$lookup.pipeline` without the match, `estimatedDocumentCount`/`watch` (throw). (2) A static test: `.collection(` with a `crm_` name or `COLL.` argument appears only in `lib/crm/db.ts`, and `clientPromise` is imported nowhere else under `lib/crm/`, `app/api/crm/` or `scripts/crm/`.

**Alternative rejected:** Adding Mongoose for hooks — a second data layer next to the driver (rejected in §1). Separate DB per workspace — viable later, but the field costs nothing now and keeps one connection.

---

## 13. One Contact per E.164 Mobile + Separate Deals and Timeline

**Decision:** `crm_contacts` holds one record per customer, unique on `{workspace, phoneE164}`. Pipeline state lives in `crm_deals` — one document per enquiry, with **at most one open deal per contact** (unique partial index on `{workspace, contactId}` where `isOpen:true`). The timeline is `crm_activities` (calls, forms, stage changes, quotations…) merge-sorted at read time with `crm_messages`; search by mobile → contact → everything by `contactId`.

**Why:** Fogging dealers re-order and government buyers return each tender season. Stage on the contact would overwrite the first sale and make "avg days lead → Closed-Won" and "conversion by source" meaningless for repeat buyers. A deal per enquiry keeps each funnel run measurable while the customer keeps one history. "Repeat Enquiry" is the entry stage of a new deal on a contact with prior deals. One open deal at a time keeps the inbox unambiguous (an inbound message belongs to exactly one live deal) and suits a 3–5 person team; a "thanks" message shortly after closing (`repeatEnquiryQuietDays`, default 3) does not spawn a deal.

**Concurrency:** a racing second creator (webhook + form for the same phone) gets E11000 on the partial index and attaches to the existing open deal instead of retrying. A contact merge requires closing (or choosing) one of two open deals first, then re-points everything in one transaction.

**Alternative rejected:** Stage on the contact (loses repeat-sale reporting). Unlimited parallel deals (each inbound would need manual routing).

---

## 14. Internal Notes Are Structurally Unsendable

**Decision:** Internal notes live in their own collection `crm_internal_notes`, behind `lib/crm/notes/**`. The guarantees, in order of strength:
1. **Module rule (guarantee):** no module that can send — `lib/crm/{outbound,broadcast,queue,automation,reminders,growth,ai,flows}/**` and the inbox/broadcast/queue/cron routes — may import `lib/crm/notes`, directly or transitively. Code that sends never holds a note.
2. **Send gate (guarantee):** every Graph call passes `lib/crm/outbound/gate.ts`, which hashes the normalised body and each template param and refuses (422 `matches_internal_note`) when it equals a `textHash` of that contact's notes. The gate projects `{textHash:1}` only; its audit row stores the note id, never text.
3. **Brands (lint only):** note text is `InternalNoteText`; outbound functions accept only `OutboundText`, minted in `lib/crm/outbound/compose.ts` by `fromComposer`, `fromTemplateParam`, `fromAutomationSetting`, `fromPersistedOutbound` (re-reads text already stored on a message/recipient row for queued retries and broadcasts). `NotInternalNote<T>` makes *direct* passing a compile error. Brands do **not** survive `.trim()`, template literals or `String()` — that laundering type-checks and is a documented gap covered by (1) and (2).

**Why:** The owner requires notes to be impossible to send, not merely hidden. A separate collection means a forgotten projection cannot leak a note (an embedded `internalNotes[]` comes back with every contact read). Type brands alone cannot deliver "impossible", so the claim rests on the import boundary and the gate; brands catch the obvious mistake early.

**Proof (tests):** (a) a `@ts-expect-error` type test compiled by a tiny tsconfig limited to `lib/crm/**` (direct passing only). (b) A static test: transitive import scan for rule 1; `as OutboundText` only in `compose.ts`; no `as any`, `as never`, `as unknown as` or `<T>expr` casts under `lib/crm/{outbound,broadcast,queue}/**`; no explicit type arguments on mint functions. (c) A mongodb-memory-server test that sends a note's text (exact, case/whitespace variant, `.trim()`-laundered, as template param, and via a tampered persisted message) and asserts refusal, zero Graph calls, one text-free audit row. Details: `docs/crm/DATA_MODEL.md` §6.

---

## 15. Growth OS Two-Point Interface, Sales-Invisible Attribution, `CRM_GROWTH_OS_SYNC`

**Decision:** (1) Website ingest writes a `crm_attribution` row per website lead — the only place the CRM keeps the submission link (`submissionId`, unique → ingest idempotency) — and, when the toggle is on, copies gclid/gbraid/wbraid/UTM into it from `submissions.attribution`. No Sales/Operations route reads this collection (static test: only `lib/crm/growth/**`, the website ingest `lib/crm/website.ts` and the conversion writer `lib/crm/conversions.ts` reference it); contacts, deals and activities carry no `submissionId`, and the `web_form` activity copies only a whitelist of form fields (never `attribution` or `form_page_url`). (2) The CRM writes `crm_conversion_events` (Closed-Won primary, Quotation Sent secondary) with value, timestamp and a unique `order_id`, and offers two audited CSV exports behind `crm.growth.export`: Google Ads Offline Conversion Import and Customer Match (SHA-256 of E.164 phone, opted-out excluded). Env `CRM_GROWTH_OS_SYNC` (default on; trimmed `0|false|off` = off): off ⇒ no click-id/UTM capture (the ingest claim row is still written), no events, exports return 409 with a message; existing rows kept. `lib/crm/**` and `lib/growth-os/**` never import each other (static test); Growth OS may later read CRM collections as data.

**Why:** Owner approved manual CSV upload (no Ads API scope risk). Keeping attribution off the deal document means no projection mistake can show ad data to sales. The recon suggested writing via `revenue-attribution.ts`; that is a code import, so the CRM keeps its own event table. `lib/gtm.ts` already captures gbraid/wbraid and persists campaign data in localStorage for 30 days, so click-id capture is largely done (a 90-day TTL is an optional later, SEO-snapshotted change).

**Pre-existing leak (to raise with the owner, not changed by this design):** `GET /api/submissions` returns full submission documents, including `attribution`, to any admin session; it is tied to open PR #18 (role gate). Until that lands, "sales-invisible" holds for CRM routes only.

**Alternative rejected:** Attribution fields on `crm_deals` with per-route projections (one forgotten projection leaks it). Direct Ads API upload (needs an owner-created Import conversion action and an OAuth scope check).

---

## 16. Mongo-Backed Queue on Vercel Hobby: Inline Webhook, Self-Continuing Chunks, One Daily Cron

**Decision:** Owner confirmed the plan is **Hobby** (crons at most once a day, timing imprecise within the hour; function max 300 s). Deferred work uses Mongo queue items with one shared shape (`status, attempts, nextAttemptAt, leaseUntil, leaseOwner, idempotencyKey`) in `crm_jobs`, `crm_broadcast_recipients` and `crm_wa_events`:
- **Webhook:** verify → insert raw events (unique dedupe key, e.g. Meta message id) → 200 → process inline in `after()`. Each webhook `after()` and inbox poll (30 s, paused when the tab is hidden) also re-processes up to 5 stale pending events; status events that arrive before their message row are retried, never dropped.
- **Interactive sends** (composer replies, quotation sends) are synchronous; only failures are queued.
- **Broadcasts, queued sends, retries:** an admin-triggered (or enqueue-triggered via `after()`) `POST /api/crm/queue/run` takes a per-number lock, claims items in rounds of 25 for ≤ 180 s, enforces the per-number rolling-24h unique-recipient tier cap (250 → 1,000 → 10,000, owner-edited; ledger row written before each Graph call; a safety margin absorbs overlap with synchronous sends; whether Meta now applies the limit per business portfolio, and the current tier sizes, are UNVERIFIED — owner to confirm), and re-invokes itself while due work remains: from `after()` it calls `CRM_PUBLIC_BASE_URL` (env, never the Host header) with a CRON_SECRET-signed HMAC header and does not await the body; the child acks 202 and works in its own `after()`. The lock is renewed/released only by its owner. On previews, Deployment Protection returns 401 to the self-call unless `VERCEL_AUTOMATION_BYPASS_SECRET` is enabled (owner action); otherwise staging chunks are re-run by hand. Progress lives in the documents (lease + status), so a killed run loses nothing; leftover retries are picked up by the next chunk or the daily cron. A send whose outcome is unknown (lease expired after `sendAttemptedAt`, no message id) is never auto-resent.
- **One new Vercel cron** `/api/crm/cron/daily` (~08:00 IST): reminder rules → tasks + WhatsApp pushes, retry/stuck sweep, template cache refresh. Reminders are also evaluated lazily (≤ every 15 min, bounded, idempotent via unique task keys) when the dashboard task list loads, so a missed or late cron self-heals. **Day-level precision is the documented reminder contract.** Adding the cron still needs owner OK (memory rule) and `CRON_PATHS` updated with `vercel.json`.
- **Documented fallback only (needs owner OK):** a GitHub Actions scheduled workflow hitting a CRON_SECRET-protected drain endpoint every 30 min.

**Why:** Vercel functions are request-scoped (an in-process `setInterval` scheduler does not work there); Hobby rules out minute crons; the 2026-10-07 Active-CPU pause argues for idle-cheap triggers (each driver exits after one indexed `findOne` when nothing is due). Volume is tiny (10–15 leads/day, 250-recipient starting tier), so a chunk loop suffices.

**Alternative rejected:** Vercel Queues (new paid primitive). A Railway worker (third runtime; contradicts "independently deployable"). A synchronous broadcast loop in one request (no retry, no cap, dies at the timeout).

---

## 17. Replace the Legacy CRM; Non-Colliding Collection Names

**Decision:** The two-collection Growth "basic CRM" (`crm_dealers`, `crm_opportunities`, 4 unvalidated routes) is replaced. New collections use other `crm_*` names (`crm_contacts`, `crm_deals`, …; full list `COLL` in `lib/crm/model.ts`). A one-time, idempotent, dry-run-first script migrates legacy rows (phone-normalised; phoneless rows reported, not migrated) and never modifies or drops the legacy collections. `crm_dealers` stays readable for Growth OS Customer Match until Growth OS is repointed. Old sidebar entries are hidden only after parity.

**Why:** The legacy model has no contacts/conversations/tasks, no phone normalisation, no audit and no per-route permissions; two parallel pipelines would confuse a small team. Reusing its names would silently mix old ISO-string rows with the new schema.

---

## 18. Staging = Branch Preview + Separate CRM DB + Local Checkpoints

**Decision:** CRM work is committed to local `main` with `checkpoint-<step>` tags; branch `crm-staging` is pushed for a Vercel preview; `main` is pushed (= production deploy) only after owner OK per step. Previews set `CRM_MONGODB_DB=100x_crm_staging`; `lib/crm/db.ts` selects `client.db(CRM_MONGODB_DB || undefined)`, so `lib/mongodb.ts` (which uses the DB named in `MONGODB_URI`) is unchanged and production keeps the default DB. A guard throws when a non-production environment resolves to `CRM_PROD_DB_NAME` (local `.env.local` points at prod and must opt in explicitly with `CRM_ALLOW_PROD_DB=1`).

**Why:** Every push to `main` auto-deploys production, so "staging → confirm → prod" needs a branch preview. A CRM-only DB name isolates CRM writes without touching the shared Mongo helper the whole site depends on.

**Caveat:** Non-CRM parts of a preview still use the preview `MONGODB_URI` (whether that is the prod DB is unverified); e.g. a form submitted on a preview writes `submissions` there and CRM rows to staging.
