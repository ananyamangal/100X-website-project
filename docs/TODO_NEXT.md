# TODO NEXT — 100X Circle Website
*Generated 2026-06-05. Prioritized work queue.*

---

## Immediate Priorities

### P1 — Fix GSC OAuth 403 (30 min)
**Blocker for:** GSC sync, SEO Opportunity Agent, keyword data in Growth OS.
1. Go to Google Cloud Console → OAuth consent screen
2. Add `sulabh.mangal@gmail.com` as a test user, OR publish the app for production
3. Ensure redirect URI matches `GOOGLE_OAUTH_REDIRECT_URI` env var exactly
4. Re-run OAuth flow from admin → SEO → Search Console Setup
5. Run first GSC sync, verify data in `gsc_data` collection

### P2 — Run GeM Backfill (3–6 hours, unattended)
GeM harvester cron only scans 120 IDs/day. No historical data before ID 9,200,000.
```bash
node scripts/gem-harvest.js --from=8500000 --to=9500000 --max-bids=500
```
Expected yield: 400–700 fogging bids from 2025–present. Run once, leave overnight.
**Why:** Procurement Intelligence dashboard has no data until this runs.

### P3 — Activate SEO Opportunity Agent (15 min)
Depends on GSC being connected (P1).
- In admin → Growth OS → Automations → SEO Opportunity Agent → Enable
- Run manually once to verify it reads `gsc_data` and creates opportunities
- Agent reads `growth_os_opportunities` collection, not GSC directly — requires a prior GSC sync

### P4 — Clean Up Root admin/ Folder (15 min)
`admin/page.tsx` at the repo root has stale hardcoded sample data. It's never served in production (all admin traffic goes to `app/admin/`).
- Confirm it's not mounted anywhere, then delete it
- Or add a redirect in `admin/page.tsx` to `/admin` to avoid confusion

---

## Recommended Implementation Sequence

### Phase 1 — Data Pipelines (this week)
1. Fix GSC OAuth (P1) → verify sync
2. Run GA4 sync if property not yet selected
3. Verify Ads sync is working (check `ads_syncs` collection)
4. Run GeM backfill script (P2)

### Phase 2 — Activate Paused Agents (next week)
5. Enable SEO Opportunity Agent once GSC data is in
6. Enable GSC Data Sync automation (weekly Monday schedule)
7. Enable AI Citation Agent — requires manual verification, but task queue creation is automated
8. Enable GeM Opportunity Agent once procurement data is populated

### Phase 3 — Content & SEO (ongoing)
9. Review schema audit findings → fix any high-priority missing JSON-LD
10. Review internal link agent findings → add links to orphan authority pages
11. Review growth_os_opportunities pending queue → action high-value items
12. Publish approved content drafts from growth_os_drafts

### Phase 4 — Unimplemented Agents (when needed)
These agents exist in `growth_os_automations` but have no implementation in `AGENT_DISPATCH`:
- Keyword Discovery Agent — requires GSC + competitor crawling
- Competitor Monitor Agent — requires competitor URL list config
- Content Brief Agent — requires approved opportunity → LLM call
- Ads Keyword Agent — requires Ads + GSC cross-referencing
- Metadata Optimizer Agent — requires GSC CTR data

---

## Estimated Effort

| Task | Effort | Dependency |
|---|---|---|
| Fix GSC OAuth 403 | 30 min | Google Cloud Console access |
| GeM backfill script run | 0 dev, 3–6h unattended | None |
| Activate SEO Opportunity Agent | 15 min | GSC OAuth fixed |
| Delete stale admin/ folder | 15 min | Confirm not used |
| Implement Keyword Discovery Agent | 1–2 days | GSC data populated |
| Implement Competitor Monitor Agent | 1–2 days | Competitor URL list |
| Implement Content Brief Agent | 1 day | LLM API key (Claude/OpenAI) |
| AI Citation Agent manual tracking | Ongoing | None (manual process) |
| Fix schema gaps (from audit) | 2–4h per page | Schema audit run |
| Add internal links (from agent) | 1–2h per batch | Internal link agent run |

---

## Quick Wins (< 1 hour each)
- Verify `CRON_SECRET` is set in Vercel env (protects harvest endpoint)
- Run schema audit agent manually → review findings → fix top 3 pages
- Run internal link agent → add links to top 2 orphan pages
- Check `harvester_state` in MongoDB → confirm cron is advancing scan position daily
- Review `growth_os_opportunities` → mark any as approved/rejected to clear backlog
