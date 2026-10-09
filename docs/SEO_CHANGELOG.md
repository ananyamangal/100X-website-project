# SEO changelog

URL | field | old | new | reason | commit | rollback

Only server-rendered TITLE / META / OG / H1-H3 changes are listed here. Body-text changes are in the SEO diff review list in the branch report. Commit hashes are filled in from `git log overnight/facts` (facts pass, 2026-10-08).

| URL | field | old | new | reason | commit | rollback |
|---|---|---|---|---|---|---|
| /about | meta description | "...pulse-jet thermal fogging machines. Founded 2014. ISO 9001:2015 certified. ..." | "...Founded 2020. ISO 9001:2015 certified. ..." | Company start is 2020 (FACTS) | 64bb39e | `git revert 64bb39e` |
| /about | og:description | "...Supplies to 50+ dealers and government bodies pan-India." | "...Supplies to dealers and government bodies pan-India." | "50+ dealers" unsupported (OPEN_FACTS 8) | 3df5bbe | `git revert 3df5bbe` |
| /become-a-dealer | og:description | "Join 50+ active dealers selling 100X Circle fogging machines across India. ..." | "Join the active dealer network selling 100X Circle fogging machines across India. ..." | "50+ active dealers" unsupported | 3df5bbe | `git revert 3df5bbe` |
| /oem-authorization-letter | og:description / twitter:description | "...ISO 9001. 4-hour response." | "...ISO 9001. Response within 24 hours on working days." | One response promise (FACTS) | 3df5bbe | `git revert 3df5bbe` |
| / (home) | trust card heading | "15+ Years Manufacturing" | "6 Years Manufacturing" (computed: current year - 2020) | Company start is 2020 | 64bb39e | `git revert 64bb39e` |
| /ai/product-catalog | H2 | "Current Product Listing (15 models)" | "Current Product Listing (N fogging machine models)" where N counts published foggers (9 today) | Heading counted every product record, including unpublished and the baggage trolley | 3df5bbe | `git revert 3df5bbe` |
| /knowledge/how-thermal-fogging-works | meta description (code seed only; the live copy comes from the knowledge database and is unchanged until the DB step) | "...heat vaporization, sub-50-micron droplet formation, and why..." | "...heat vaporization, fine droplet formation, and why..." | Blanket micron claim removed | 051232d | `git revert 051232d` |
| /knowledge/how-thermal-fogging-works | og:description (same caveat) | "...forming sub-50-micron droplets that penetrate..." | "...forming fine droplets that penetrate..." | same | 051232d | `git revert 051232d` |
| /compare/* (all 20) | FAQPage JSON-LD answers and body text | "...since 2014...", "10+ year track record", "sub-50-micron droplets" | "...since 2020...", "track record ... since 2020", "fine droplets" | Facts | 64bb39e, 051232d | revert those commits |

Not changed (protected hubs): `/past-performance-government` still carries "80+ departments across 15+ states" in its meta description and "across 15+ states" in og:description. See the branch report.
