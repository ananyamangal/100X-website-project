# TODO NEXT — 100X Circle Website
*Last updated 2026-06-05. Prioritized work queue.*

---

## Immediate Priorities

### P1 — Run GeM Phased Backfill (~21 hrs total across 3 sessions)
Coverage audit (2026-06-05) found the previous range (7.15M–7.58M) only covered Nov 2024–Feb 2025.
The correct Jan 2025 → Jun 2026 range is **7,400,000 → 9,420,000** (~2M IDs). Run as 3 phases.
Each phase checkpoints every 500 IDs — safe to interrupt and resume.

**Phase A — Jan 2025 → Sep 2025** (~800K IDs, est. 7–9 hrs):
```bash
node scripts/gem-harvest.js --from=7400000 --to=8200000 --concurrency=30
```

**Phase B — Sep 2025 → Jan 2026** (~700K IDs, est. 6–8 hrs):
```bash
node scripts/gem-harvest.js --from=8200000 --to=8900000 --concurrency=30
```

**Phase C — Jan 2026 → Jun 2026** (~520K IDs, est. 4–6 hrs):
```bash
node scripts/gem-harvest.js --from=8900000 --to=9420000 --concurrency=30
```

Expected total yield: 65–175 genuine fogging bids, 20–60 dealer stubs.
Run phases sequentially. After all complete, reset cron position in admin → Procurement → Harvester.
**Why:** All Procurement Intelligence dashboards have 0 genuine fogging data until this runs.

### P2 — Dealer Intelligence Population (1–2 hours after P1)
After backfill, `proc_dealers` will auto-populate from bid data. Then:
- Review dealer stubs in admin → Procurement → Dealers
- Identify top 10 dealers by bid volume and win rate
- Flag dealers operating in high-value states (UP, Maharashtra, Rajasthan, MP)
- Cross-check against known authorized dealer list for authorization gaps

### P3 — OEM Authorization Opportunity Analysis (2–3 hours after P1)
After backfill, OEM Intelligence will show which manufacturers are winning bids without GeM authorization.
- In admin → Procurement → Intelligence → OEM view
- Identify OEMs winning L1 bids in states where 100X Circle is not yet registered as authorized supplier
- Prioritize GeM seller registration in those state procurement zones
- Flag for business development action

### P4 — Clean Up Root admin/ Folder (15 min)
`admin/page.tsx` at the repo root has stale hardcoded sample data. It's never served in production (all admin traffic goes to `app/admin/`).
- Confirm it's not mounted anywhere, then delete it
- Or add a redirect in `admin/page.tsx` to `/admin` to avoid confusion

---

## Recently Completed (2026-06-05)
- ~~P1 — Fix GSC OAuth 403~~ **DONE** — GSC fully operational, 271 queries + 49 pages stored
- ~~P3 — Activate SEO Opportunity Agent~~ **DONE** — 6 opportunities found, content draft generation validated
- Google Ads fully operational — campaigns, keywords, conversions syncing
- Procurement Intelligence dashboards all deployed (dealer, OEM, department, synthesis)
- GeM Harvester validation scan completed — ID range corrected and extraction verified

---

## Recommended Implementation Sequence

### Phase 1 — Data Pipelines ✓ COMPLETE
1. ~~Fix GSC OAuth~~ **Done** — 271 queries, 49 pages stored
2. ~~Run GA4 sync~~ **Done**
3. ~~Verify Ads sync~~ **Done** — campaigns, keywords, conversions confirmed
4. Run GeM backfill script → **P1 (pending)**

### Phase 2 — Activate Paused Agents (in progress)
5. ~~Enable SEO Opportunity Agent~~ **Done** — 6 opportunities found
6. Enable GSC Data Sync automation (weekly Monday schedule) — ready now
7. Enable AI Citation Agent — requires manual verification, but task queue creation is automated
8. Enable GeM Opportunity Agent — **blocked on P1 (backfill)**

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

| Task | Effort | Dependency | Status |
|---|---|---|---|
| ~~Fix GSC OAuth 403~~ | ~~30 min~~ | — | **Done** |
| ~~Activate SEO Opportunity Agent~~ | ~~15 min~~ | — | **Done** |
| GeM backfill Phase A (7.4M→8.2M) | 0 dev, 7–9h unattended | None | **Pending (P1)** |
| GeM backfill Phase B (8.2M→8.9M) | 0 dev, 6–8h unattended | Phase A done | **Pending (P1)** |
| GeM backfill Phase C (8.9M→9.42M) | 0 dev, 4–6h unattended | Phase B done | **Pending (P1)** |
| Dealer intelligence population | 1–2h review | GeM backfill | **Pending (P2)** |
| OEM authorization opportunity analysis | 2–3h analysis | GeM backfill | **Pending (P3)** |
| Delete stale admin/ folder | 15 min | Confirm not used | Pending (P4) |
| Enable GSC Data Sync automation | 5 min | GSC connected | Ready now |
| Implement Keyword Discovery Agent | 1–2 days | GSC data populated | Phase 4 |
| Implement Competitor Monitor Agent | 1–2 days | Competitor URL list | Phase 4 |
| Implement Content Brief Agent | 1 day | LLM API key (Claude/OpenAI) | Phase 4 |
| AI Citation Agent manual tracking | Ongoing | None (manual process) | Ongoing |
| Fix schema gaps (from audit) | 2–4h per page | Schema audit run | Phase 3 |
| Add internal links (from agent) | 1–2h per batch | Internal link agent run | Phase 3 |

---

## Quick Wins (< 1 hour each)
- Enable GSC Data Sync automation (weekly Monday) — admin → Growth OS → Automations
- Verify `CRON_SECRET` is set in Vercel env (protects harvest endpoint)
- Run schema audit agent manually → review findings → fix top 3 pages
- Run internal link agent → add links to top 2 orphan pages
- Check `harvester_state` in MongoDB → confirm cron is advancing scan position daily
- Review `growth_os_opportunities` (6 pending) → mark as approved/rejected to action backlog
