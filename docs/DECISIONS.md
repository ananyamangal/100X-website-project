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
