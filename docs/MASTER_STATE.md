# MASTER STATE — 100X Circle Website
*Last updated 2026-06-05. Source of truth for future sessions.*

---

## Company
**100X Circle Pvt Ltd** — Indian OEM manufacturer of pulse-jet thermal fogging machines.
Brands: 100X, Instafog. Factory: IMT Manesar, Gurugram, Haryana.
Site: https://www.100xcircle.com | Email: 100xcircle@gmail.com | WhatsApp: +91-7827229116

---

## Architecture

| Layer | Technology |
|---|---|
| Framework | Next.js 15.2 (App Router), React 18, TypeScript |
| Styling | Tailwind CSS 3, Radix UI, shadcn/ui |
| Database | MongoDB 6 (native driver + Mongoose) — single `MONGODB_URI` |
| Media | Cloudinary (next-cloudinary v6) |
| Email | Nodemailer |
| Auth | Cookie-only (`admin-token=authenticated`) — no next-auth |
| Deployment | Vercel (Fluid Compute) |
| Cron | vercel.json — one cron: `/api/admin/procurement/harvest` at `30 0 * * *` |

**Repo structure:**
```
app/           Next.js App Router pages + API routes
admin/         Legacy admin shell (root-level, older code — not the real admin)
components/    shadcn/ui components
lib/           All shared logic: models, API clients, Growth OS agents
scripts/       CLI scripts (gem-harvest.js, seed-blogs.js)
docs/          This directory
```

The real admin panel is `app/admin/` (not the root `admin/` folder which has stale sample data).

---

## Major Modules

### 1. Public Website
Pages: `/`, `/products`, `/products/[slug]`, `/about`, `/contact-us`, `/factory`, `/blog`, `/blog/[slug]`, `/knowledge/*`, `/case-studies`, `/compare`, `/vehicle-mounted-fogging-machine`, `/power-tiller`, `/spare-parts`, `/spare-parts/[slug]`, `/ai/*`, plus 8 legal pages.

### 2. Admin Panel (`app/admin/page.tsx`)
Single React page, cookie auth, tab-based UI. Tabs inferred from API routes:
- Products, Blogs, Spare Parts, Customers, Accreditations, Case Studies, Videos, Reviews
- Banners, Celebrity Assets, Homepage Sections, Site Settings, Trust Badges, Brand Assets
- RFQ Popup, Brochure, Deployments
- **Lead Analytics** — aggregates all lead sources
- **Growth OS** — agents, opportunities, content drafts, citations, lead scores, attribution
- **SEO** — GSC connect/sync, GA4 connect/sync
- **Ads** — Google Ads connect/sync/view
- **Procurement Intelligence** — bid lifecycle, dealer tracking
- **Harvester** — GeM scan control and status

Admin login: `app/admin/login/page.tsx` → sets `admin-token` cookie.
Auth middleware: `app/admin/middleware.ts`.

### 3. Growth OS
SEO + GEO (Generative Engine Optimization) intelligence layer.

**Agents (lib/growth-os/agents/):**
| Agent | ID | Status | What it does |
|---|---|---|---|
| Dealer Lead Agent | `dealer-lead-agent` | active | Classifies leads, scores dealer potential |
| Schema Audit Agent | `schema-audit` | active | Audits JSON-LD on all sitemap pages |
| Internal Link Agent | `internal-link-agent` | active | Finds orphan/weak authority pages |
| AI Citation Agent | `ai-citation-agent` | paused | Tracks 100X mentions on 5 AI platforms × 10 queries |
| SEO Opportunity Agent | `seo-opportunity-agent` | active | GSC near-wins, rank drops, CTR gaps — 6 opportunities found; content draft generation validated |
| GSC Data Sync | `gsc-sync` | paused | Pulls 28-day GSC data to MongoDB |
| Keyword Discovery | `keyword-discovery` | paused | Not yet implemented |
| Competitor Monitor | `competitor-monitor` | paused | Not yet implemented |
| Content Brief Agent | `content-brief-agent` | paused | Not yet implemented |
| Ads Keyword Agent | `ads-keyword-agent` | paused | Not yet implemented |
| Metadata Optimizer | `metadata-optimizer` | paused | Not yet implemented |
| GeM Opportunity Agent | `gem-opportunity-agent` | paused | Not yet implemented |

**GEO tracking targets:** 10 queries × 5 platforms (ChatGPT, Gemini, Claude, Perplexity, Google AI Overviews) = 50 combinations.

### 4. Google Integrations
Single OAuth2 web flow (`lib/google-oauth.ts`) powers all three integrations.
Tokens stored in MongoDB `google_oauth_tokens` (singleton doc, auto-refreshed).

| Integration | Status | Key env var |
|---|---|---|
| Google Search Console | OAuth done; 403 consent screen issue reported | `GOOGLE_SC_SITE_URL` |
| Google Analytics 4 | Implemented — property select + sync | — |
| Google Ads | Implemented — account select + GAQL sync | `GOOGLE_ADS_DEVELOPER_TOKEN` |

### 5. Procurement Intelligence
Tracks GeM government bids for fogging machines. **All dashboards deployed and operational.**
- **bid_lifecycle** — scraped GeM bid records (bid number, dept, state, status, L1/L2/L3 dealers, prices)
- **proc_dealers** — dealer names auto-detected from bid data
- **harvester_state** — singleton storing scan position, run stats

**Deployed intelligence views:**
- **Dealer Intelligence** — dealer win-rates, bid history, competitive positioning (`/api/admin/procurement/dealers`)
- **OEM Intelligence** — manufacturer tracking, authorization gap identification (`/api/admin/procurement/brands`)
- **Department Intelligence** — aggregate by buying department, spend patterns (`/api/admin/procurement/departments`)
- **Synthesis view** (`/api/admin/procurement/intelligence`) — cross-cuts dealers, OEMs, departments, states, and authorization opportunities

### 6. GeM Harvester
**Daily cron** (00:30 UTC) → `GET /api/admin/procurement/harvest`
- Scans 80 sequential GeM BidPlus IDs per run, concurrency 5
- Matches keywords: fogging, fogger, fog machine, thermal fog, cold fog
- Default start ID: 9,200,000 (≈ Jan 2026); moves forward each run
- Saves/upserts to `bid_lifecycle`, auto-creates dealer stubs in `proc_dealers`
- `maxDuration = 120` on Vercel (increased from 60 after stuck-flag incident)

**Validation scan completed (2026-06-05):** Extraction verified on corrected ID range `8,500,000–9,500,000`. Fogging bids confirmed present and parseable. Full backfill not yet executed.

**Local backfill script:** `scripts/gem-harvest.js`
- Usage: `node scripts/gem-harvest.js --from=8500000 --to=9500000`
- Corrected ID range: `--from=8500000 --to=9500000` (validated for 2025–present data)
- Uses native `https` module — no npm install needed beyond mongodb
- Concurrency up to 50, handles 300k+ IDs

**Manual via admin UI:** POST `/api/admin/procurement/harvest` with `{action:"scan", from, to}`

### 7. MCP Server
JSON-RPC 2.0 at `POST /api/mcp`. No auth required (public).
10 tools: `get_company_info`, `get_factory_info`, `get_product_catalog`, `get_product_details`, `get_certifications`, `get_government_supply_experience`, `find_product_for_use_case`, `compare_products`, `request_quotation`, `locate_dealer`.
4 resources: company, products, certifications, government-supplies.
Knowledge source: `lib/ai/knowledge.ts` (static, last updated 2026-05-29).

### 8. AI Knowledge Pages
`/ai/about-100x`, `/ai/certifications`, `/ai/entity-graph`, `/ai/factory`, `/ai/government-supplies`, `/ai/manufacturing-capabilities`, `/ai/product-catalog`, `/ai/scorecard` — static pages for AI crawler indexing.

---

## MongoDB Collections

### Content
| Collection | Purpose |
|---|---|
| `products` | Product catalog (cinematic model: filmChapters, boxContents, productFaqs, ugcImages) |
| `blogs` | Blog posts with rich text HTML |
| `spare_parts` | Spare parts catalog with product compatibility |
| `customers` | Customer records |
| `accreditations` | Certifications/accreditations display |
| `case_studies` | Customer case studies |
| `videos` | YouTube video library |
| `reviews` | Customer reviews |
| `banners` | Homepage banner slides |
| `celebrity_assets` | Celebrity endorsement images |
| `homepage_sections` | Homepage content blocks |
| `home_content` | General homepage content |
| `about_page` | About page content |
| `legal_pages` | Privacy, terms, refund, warranty, etc. |
| `site_settings` | Global site config |
| `trust_badges` | Trust badge icons/labels |
| `brand_assets` | Downloadable brand assets |
| `brochure_pdf` | Brochure document metadata |
| `rfq_popup_config` | RFQ popup form config |
| `deployments` | Installation/deployment tracking |

### Leads
| Collection | Source |
|---|---|
| `submissions` | Contact form, brochure, gem_popup |
| `rfq_popup_leads` | RFQ popup form |
| `gem_inquiries` | GeM interest form |
| `brochure_leads` | Brochure download gate |

### Google Integrations
| Collection | Purpose |
|---|---|
| `google_oauth_tokens` | Singleton OAuth token doc |
| `ga4_settings` | Selected GA4 property |
| `ads_settings` | Selected Ads customer ID |
| `ads_syncs` | Sync history (keep last 30) |
| `ads_campaign_rows` | Campaign performance by syncDate |
| `ads_keyword_rows` | Keyword performance by syncDate |
| `ads_searchterm_rows` | Search terms by syncDate |
| `ads_device_rows` | Device breakdown by syncDate |
| `ads_location_rows` | Geographic data by syncDate |
| `ads_overview_rows` | Aggregated overview by syncDate |
| `gsc_data` | GSC query/page rows by syncDate |

### Growth OS
| Collection | Purpose |
|---|---|
| `growth_os_logs` | Agent run logs, capped at 1000 entries |
| `growth_os_automations` | Automation configs and run history |
| `growth_os_opportunities` | SEO/growth opportunities pipeline |
| `growth_os_drafts` | Content drafts (ContentDraft type) |
| `growth_os_schema_audit` | Latest schema audit result |
| `growth_os_link_graph` | Latest internal link graph |
| `growth_os_citations` | AI platform citation tracking records |
| `growth_os_lead_scores` | Lead scoring results |

### Procurement
| Collection | Purpose |
|---|---|
| `bid_lifecycle` | GeM fogging bids (upsert on bid_number) |
| `proc_dealers` | Dealer stubs auto-created from bids |
| `harvester_state` | Singleton: scan position, cumulative stats |

---

## API Routes

### Public
```
GET  /api/about-page
GET  /api/products
GET  /api/product-slug
GET  /api/case-studies
GET  /api/case-studies/[slug]
GET  /api/videos
GET  /api/deployments
GET  /api/submissions
POST /api/rfq-submit
POST /api/rfq-upload
GET  /api/rfq-attachments/[id]
POST /api/brochure/download
POST /api/brochure-leads
GET  /api/files/[id]
GET  /api/merchant/products.xml   (Google Merchant feed)
GET  /api/indexnow
GET  /robots.ts
GET/POST /api/mcp                  (MCP server — public)
GET  /api/ai/[entity]              (AI knowledge — public)
```

### Admin — Content CRUD
All under `/api/admin/`:
`products`, `products/[id]`, `blogs`, `blogs/[id]`, `spare-parts`, `spare-parts/[id]`,
`customers`, `customers/[id]`, `accreditations`, `accreditations/[id]`,
`case-studies`, `case-studies/[id]`, `videos`, `videos/[id]`, `reviews`, `reviews/[id]`,
`banners`, `banners/[id]`, `celebrity-assets`, `celebrity-assets/[id]`,
`homepage-sections`, `homepage-sections/[id]`, `home-content`, `about-page`,
`trust-badges`, `brand-assets`, `brochure`, `brochure/upload`, `legal-pages`,
`site-settings`, `rfq-popup`, `rfq-popup/leads`, `deployments`, `deployments/[id]`,
`upload-file`, `[slug]` (generic content endpoint)

### Admin — Analytics + System
```
GET  /api/admin/lead-analytics
GET  /api/admin/brochure-analytics
GET  /api/admin/health
POST /api/admin/test-email
POST /api/admin/auth              (login)
POST /api/admin/auth/change-password
```

### Growth OS
```
GET  /api/admin/growth/dashboard
GET  /api/admin/growth/logs
GET/POST /api/admin/growth/opportunities
GET  /api/admin/growth/content
GET  /api/admin/growth/citations
GET  /api/admin/growth/citation-tasks
GET  /api/admin/growth/lead-scores
GET  /api/admin/growth/attribution
GET/PATCH/POST /api/admin/growth/automation
POST /api/admin/growth/agents/dealer-lead
POST /api/admin/growth/agents/schema-audit
POST /api/admin/growth/agents/internal-link
POST /api/admin/growth/agents/ai-citation
POST /api/admin/growth/agents/seo-opportunity
```

### Google Integrations
```
GET  /api/admin/gsc/oauth/start
GET  /api/admin/gsc/oauth/callback
GET/DELETE /api/admin/gsc/oauth/status
GET  /api/admin/gsc/data
POST /api/admin/gsc/sync
GET  /api/admin/gsc/test
GET  /api/admin/ga4/properties
POST /api/admin/ga4/sync
GET  /api/admin/ga4/data
GET  /api/admin/ga4/debug
GET  /api/admin/ga4/test
GET  /api/admin/ads/accounts
POST /api/admin/ads/sync
GET  /api/admin/ads/data
GET  /api/admin/ads/test
```

### Procurement
```
GET  /api/admin/procurement/stats
GET/POST /api/admin/procurement/bids
GET/POST /api/admin/procurement/dealers
GET/POST /api/admin/procurement/brands
GET  /api/admin/procurement/heatmap
GET  /api/admin/procurement/departments    ← NEW: aggregate by buying dept
GET  /api/admin/procurement/intelligence   ← NEW: synthesis view (dealers/OEMs/depts/states/auth opps)
POST /api/admin/procurement/import
POST /api/admin/procurement/collect
POST /api/admin/procurement/batch-parse
POST /api/admin/procurement/batch-fetch
GET/POST /api/admin/procurement/harvest
```

---

## Integration Status

### Google Ads
- OAuth: shared with GSC (scopes include `adwords`)
- Developer token: `GOOGLE_ADS_DEVELOPER_TOKEN` env var required
- API version: v24 (GAQL)
- Sync: campaigns, keywords, search terms, devices, locations, conversions (all_conversions)
- **Status: Fully operational. Campaigns, keywords, and conversions syncing confirmed.**
- Known issue: `metrics.conversions` was removed from GAQL queries (commit `4479dc3`) — uses `metrics.all_conversions` for conversion_action entity instead.

### Google Search Console
- OAuth: web flow, tokens in `google_oauth_tokens`
- Sync: query + page dimensions, 28-day window, paginated (max 5000 rows)
- **Status: Fully operational. 271 queries and 49 pages stored in `gsc_data`. Sync confirmed (2026-06-05).**

### Google Analytics 4
- Property listing via Admin API v1beta
- Data via Data API v1beta (runReport)
- **Status: Fully implemented.**

### GeM Harvester
- **Status: Live. Daily cron operational. Validation scan completed — extraction verified on corrected ID ranges.**
- Fix (2026-06-05): maxDuration→120, SCAN_PER_RUN→80, stale lock detection, `running_since` tracking, `reset` POST action.
- Cron advances from ID 9,200,000 forward (June 2026 range). Covers ~2026 bids only.
- ID range corrected and validated: `--from=8500000 --to=9500000` confirmed to contain 2025–present fogging bids.
- **Full backfill not yet executed.** Command: `node scripts/gem-harvest.js --from=8500000 --to=9500000 --concurrency=30`. Expected: 400–700 bids, 3–6 hours unattended.

### MCP Server
- **Status: Live at /api/mcp. No auth required.**

---

## Completed Milestones
- Full public website with product catalog, blog, knowledge hub, case studies
- Admin panel with CRUD on all content collections
- Cookie-based admin auth
- Cloudinary image upload integration  
- Cinematic product pages (filmChapters, boxContents, productFaqs, ugcImages)
- Spare parts catalog with product compatibility
- RFQ system (form + file attachments)
- Brochure download lead gate
- Lead analytics aggregating all sources
- Growth OS framework (agents, logs, opportunities, content drafts)
- Dealer Lead Agent, Schema Audit Agent, Internal Link Agent (all active)
- Single Google OAuth covering GSC + GA4 + Ads
- GSC fully operational: 271 queries, 49 pages stored; sync confirmed
- Google Analytics 4 data sync pipeline operational
- Google Ads fully operational: campaigns, keywords, conversions syncing
- SEO Opportunity Agent active: 6 opportunities found, content draft generation validated
- Procurement Intelligence: all dashboards deployed (bids, dealers, heatmap, stats, departments, intelligence synthesis)
- Dealer Intelligence dashboard deployed (win-rates, bid history, competitive positioning)
- OEM Intelligence dashboard deployed (manufacturer tracking, authorization gap analysis)
- Department Intelligence dashboard deployed (buying-dept aggregates, spend patterns)
- GeM Harvester (daily cron + local script + admin manual trigger); validation scan completed, ID range corrected
- MCP server (10 tools, 4 resources)
- AI knowledge pages (/ai/*) for crawler indexing
- AI Citation Agent infrastructure (paused — manual checking required)
- SEO: sitemap, robots.txt, IndexNow, JSON-LD structured data
- Google Merchant XML feed at /api/merchant/products.xml

---

## Known Bugs / Issues
1. ~~**GSC 403**~~ **RESOLVED (2026-06-05)**: GSC diagnostic passes completely. OAuth is connected and functional.
2. **admin/page.tsx (root)**: Legacy file with hardcoded sample data — not the real admin. Real admin is `app/admin/`. The root `admin/` folder appears unused.
3. **AI Citation Agent**: Paused because manual checking (visiting ChatGPT/Gemini/etc.) can't be automated without external APIs. The agent creates task queues but doesn't auto-verify.
4. **Growth OS automations seeded with mock data**: Several automations have fake `successRate`, `runCount`, `lastResult` values from the default seed. They reset when the agent is first actually run.
5. ~~**SEO Opportunity Agent writes to wrong collection**~~ **FIXED (2026-06-05)**: `lib/growth-os/agents/seo-opportunity.ts` was writing to `growth_os_content_drafts`; now writes to `growth_os_drafts` with ContentDraft-compatible schema.
6. ~~**GSC sync URL construction broken in automation route**~~ **FIXED (2026-06-05)**: `app/api/admin/growth/automation/route.ts` used a broken `NEXTAUTH_URL || VERCEL_URL` ternary; now uses `NEXT_PUBLIC_SITE_URL` canonical pattern consistent with `lib/google-oauth.ts`.
7. ~~**GeM Harvester stuck on first run**~~ **FIXED (2026-06-05)**: `maxDuration=60` too short for 120 IDs × 8s timeout. Vercel killed first run without cleanup → `running: true` permanently. Fixed: maxDuration→120, SCAN_PER_RUN→80, `running_since` stale detection, `reset` POST action.
8. ~~**Growth OS automations missing gsc-sync and seo-opportunity-agent**~~ **FIXED (2026-06-05)**: GET handler now upserts missing DEFAULT_AGENTS on each call.

---

## Environment Variables Required
```
MONGODB_URI
NEXT_PUBLIC_SITE_URL=https://www.100xcircle.com
ADMIN_PASSWORD
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REDIRECT_URI
GOOGLE_SC_SITE_URL=https://www.100xcircle.com/
GOOGLE_ADS_DEVELOPER_TOKEN
CLOUDINARY_CLOUD_NAME (or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / EMAIL_TO
CRON_SECRET                    (optional, for harvest cron auth)
```
