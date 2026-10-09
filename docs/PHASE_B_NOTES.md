# Phase B notes: hidden footer keyword block (for the owner's decision)

Written 2026-10-09 (batch 4). Nothing was changed. This note describes the block and the risk so the owner can decide.

## What it is

`components/SiteFooter.tsx`, at the end of the footer's bottom bar (added 2026-06-01 in commit b852e50, "premium design overhaul"):

```tsx
{/* Hidden SEO keywords - visually hidden but accessible */}
<p className="sr-only">
  Fogging machine manufacturer India, thermal fogging machine, mosquito fogger, vehicle mounted fogging machine,
  industrial fogging machine, pest control equipment, fogging machine Delhi, fogging machine UP, fogging machine Bihar,
  fogging machine Mumbai, fogging machine Pune, 100X Circle
</p>
```

## How it is hidden

- Tailwind `sr-only` sets `position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border-width: 0`.
- The text is in the server-rendered HTML, so crawlers read it. Sighted visitors never see it. Screen readers read it out as one run-on sentence at the end of every page.
- It is not a skip link, label or other accessibility text. It is a comma-separated list of search phrases and place names.

## Where it renders

- On every public page. `SiteFooter` is rendered by `components/layout/SiteShell.tsx`, which both `app/(site)/layout.tsx` and `app/[locale]/layout.tsx` use. That covers the home page, products, landing pages, blog, knowledge, compare and case-study pages, in every locale (the text is English only and is not translated).
- So the same 12 phrases repeat on about 290 indexed pages.

## Policy

Google's spam policies list "hidden text and links" as a violation: text placed on a page mainly for search engines and hidden from visitors, including text positioned off-screen or made very small. Google gives one exception, text that improves accessibility (for example alt text or screen-reader descriptions of what is on screen). This block does not describe anything on the page; it is a keyword list. Its own code comment says "Hidden SEO keywords". Separately, a list of place names ("fogging machine Delhi, fogging machine UP, fogging machine Bihar, fogging machine Mumbai, fogging machine Pune") is the "blocks of text listing cities and regions a page is trying to rank for" example that Google gives under keyword stuffing.

## Risk

- **Ranking benefit: none to negligible.** Google largely ignores hidden boilerplate, and the same phrases already appear in visible titles, headings and body copy across the site. Site-wide footer text carries very little weight.
- **Risk level: low to medium.** Low chance of an algorithmic hit from 12 phrases. But it is a clear policy match if a person reviews the site (for example after a spam report or a reconsideration request), and a manual action for hidden text can affect the whole site. The site's recent traffic growth (agency reports, Dec 2025 to Sep 2026) did not come from this block.
- **Accessibility cost:** screen-reader users hear a keyword list on every page.

## Options

1. **Remove the `<p className="sr-only">` block (recommended).** Removes the policy risk. No visible change. Expected ranking effect: none, since every phrase is already in visible copy. Revert is one line. This is a sitewide HTML change, so it should ship as its own commit and be checked against Search Console after 7 and 14 days, as for the Tier A pages.
2. **Make it visible and useful.** Replace it with a short visible "We supply to" line that links to real pages (for example `/fogging-machine-supplier-in-bihar` and the other state supplier pages, if they exist). Only list places with a real page and a real supply record (docs/FACTS.md: 12 verified states). This keeps the local relevance honestly.
3. **Leave it as it is.** Keeps a small, ongoing manual-action risk for no measurable gain.

Owner decision needed: 1, 2 or 3.
