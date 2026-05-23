# Homepage Redesign — Design Spec

**Date:** 2026-05-23
**Scope:** `app/page.tsx` (homepage only)
**File today:** 1716 lines, ~6 inline `<section>` blocks plus an inline `AccreditationsScroll` component and a hero image slider
**Outcome:** A leaner homepage that reads buyer-first, embeds keywords without paragraph walls, and is structured so each section can be edited in isolation.

---

## Guiding Principle

**SEO does not dictate UX structure.** Modern AI search engines (Google AI Overviews, ChatGPT retrieval, Perplexity, Gemini) reward structure, clarity, semantic authority, expertise, and engagement far more than keyword density. The job of the page is:

1. Visual trust first
2. Product understanding second
3. Technical proof third
4. SEO embedded naturally — not stamped on top

Every change in every phase must respect this ordering.

---

## Phase 1 — Pure Refactor (no UI/content changes)

**Goal:** Reduce `app/page.tsx` from 1716 lines to ~400 by extracting the homepage sections into `components/home/`. Visual output must be byte-identical. No copy edits, no styling changes, no business-logic changes. This phase exists solely to make Phase 2 a localised edit rather than a 1700-line surgery.

### Files to create

```
components/home/
  HeroBlock.tsx              # existing hero: image slider + headline + stats + CTAs + slide controls
  AccreditationsStrip.tsx    # the current inline AccreditationsScroll component, lifted out
  ManufacturerIntroBlock.tsx # current "Manufacturer Intro" section as-is (5 paragraphs + benefits grid)
  ProductsBlock.tsx          # current products section: heading + grid + CTA
  TrustBlock.tsx             # current testimonials section
  BlogBlock.tsx              # current industry-insights/blog grid
```

`SectionConnector.tsx` is NOT created in Phase 1 — it's a Phase 2 concern.

### Files to leave alone

- `FAQSection`, `ContactSection`, `WhatsAppFloatingButton`, `Navbar`, `SiteFooter`, `cta/MobileCtaBar` — already components.
- `BrochureFormModal` (currently inline) — leave inline; not on the homepage redesign path.
- Header/nav and footer JSX inside `app/page.tsx` — leave inline. The non-Next-Router page-switching pattern (`currentPage` state) is unusual and worth fixing later, but not in Phase 1.

### Data flow

All data fetching stays in `app/page.tsx`. Each new component is a **pure presentational component** that receives data via props:

| Component | Props |
|---|---|
| `HeroBlock` | `slides`, `bannersLoading`, `stats`, `changingPhrases`, `phraseIndex`, slider state callbacks (`currentSlide`, `setCurrentSlide`, refs) |
| `AccreditationsStrip` | `accreditations` |
| `ManufacturerIntroBlock` | none (static copy in Phase 1) |
| `ProductsBlock` | `products`, `loadingProducts`, brochure modal handler |
| `TrustBlock` | `testimonials`, `testimonialsLoading` |
| `BlogBlock` | `blogPosts`, `blogLoading` |

Slider/marquee state hooks stay in `app/page.tsx` and are passed down as props, **OR** are moved to each block's local state. Pick one approach per component during implementation — whichever produces less diff and zero behavior change.

### Final `app/page.tsx` shape (Phase 1 only)

```tsx
// data fetching effects, state, handlers — unchanged
// brochure modal — inline, unchanged
// header/nav — inline, unchanged

return (
  <>
    <BrochureFormModal ... />
    <Header ... />
    {currentPage === "home" && (
      <>
        <HeroBlock ... />
        <AccreditationsStrip accreditations={accreditations} />
        <ManufacturerIntroBlock />
        <ProductsBlock products={products} ... />
        <TrustBlock testimonials={testimonials} ... />
        <BlogBlock blogPosts={blogPosts} ... />
        <FAQSection />
        <ContactSection products={products} />
      </>
    )}
    {/* other currentPage branches — unchanged */}
    <Footer />
  </>
)
```

### Phase 1 verification gate (all must pass)

- `pnpm build` exits clean (no new TS errors)
- `pnpm lint` exits clean (or matches baseline)
- Manual spot-check: load `/` in dev, compare to current production screenshot for hero, accreditations strip, manufacturer intro, products grid, testimonials, blog cards. **Zero visual diff.**
- Hydration: no client/server mismatch warnings in console
- All interactive behavior preserved: slider arrows, slider touch swipe, slider dots, product card clicks, brochure modal trigger, "Watch Demo" YouTube popup, "Explore Products" anchor scroll
- Commit Phase 1 before moving to Phase 2

---

## Phase 2 — UX Redesign

**Goal:** Reorganize the homepage into a buyer-first narrative, trim verbose SEO paragraphs by ~50% while preserving keywords, add a hero video block and a new technology section, and adopt 2026 B2B industrial UI patterns.

### Section order (final)

```
1. Hero                       (image slider — kept from Phase 1)
2. Hero Video Block           (NEW — YouTube embed, prominent placement)
3. Accreditations Strip       (kept — moves with the trust narrative)
4. Manufacturer Intro         (TRIMMED to 2 paragraphs + benefits grid)
5. Technology Block           (NEW — pulse-jet how-it-works explainer)
6. Products                   (TRIMMED intro)
7. Trust / Testimonials       (TRIMMED intro)
8. Blog / Industry Insights   (TRIMMED intro)
9. FAQ                        (existing, no edits)
10. Contact                   (existing, no edits)
```

`SectionConnector` introduced as a small lead-in between sections (single line, badge or one-sentence transition) to give the page a narrative spine: "Built for India — for a decade and counting" → "The technology behind every machine" → "See the full range" → "Trusted by 10,000+ customers" etc.

### New components

**`HeroVideoBlock.tsx`**
- One prominent YouTube embed from `@100Xcircle`
- Click-to-play poster with the play icon (do not autoplay; respects user data + battery)
- Caption: short product line ("See the 100X DB400 in the field")
- Surrounding chrome minimal — focus on the video itself
- Responsive: 16:9 aspect-ratio on all viewports
- Adjacent to a 1-line section connector above and below

**`TechnologyBlock.tsx`** — explains:
1. **Pulse-jet combustion** — what the engine does, why it matters (consistent fog output, no mechanical compressor)
2. **Ultra-low particle fog** — droplet micron size and what that enables
3. **Penetration efficiency** — why thermal fog reaches places spray cannot (vegetation, drains, voids)
4. **Lower chemical usage** — outcome metric for buyers
5. **Municipal + agriculture applications** — connects the technology to two distinct buyer journeys

Layout: 4-step illustrated explainer (icons + 1-sentence each) for the process, then a 2-card split for applications (municipal vs agricultural). No paragraph walls. Keywords appear naturally in card titles, subtitles, and ARIA labels.

**`SectionConnector.tsx`**
- One-line transition between sections
- Variants: small badge (eyebrow), short heading, or both
- Used 4–6 times across the page to build narrative flow

### Content trimming targets

| Section | Today | Target |
|---|---|---|
| Manufacturer Intro | ~5 paragraphs + 6-item list | 2 short paragraphs + same 6-item list |
| Products intro | ~3 lines of marketing copy | 1 short line |
| Trust intro | ~2 lines | 1 short line |
| Blog intro | ~2 lines | 1 short line |
| Hidden SEO paragraphs in hero | 3 `<p className="hidden">` blocks | Remove (replaced by JSON-LD authority signals in Phase 3) |

**Keyword preservation rule:** Every keyword present today must still appear at least once on the page (in heading, subheading, card title, alt text, or JSON-LD). Track keyword inventory before edits; verify after.

### Mobile-first improvements (Phase 2)

- Tighten vertical rhythm on mobile: section padding `py-12` → `py-10` on screens < `md`
- Hero video and technology block: full-bleed on mobile, contained on desktop
- CTA hierarchy on mobile: primary CTA visible above the fold of every major section (not just hero)
- Inquiry/WhatsApp CTAs repeated at the bottom of Manufacturer Intro and Technology blocks

### CTA hierarchy

Three CTA tiers used consistently:
- **Primary** — `Get a Quote` (green solid)
- **Secondary** — `WhatsApp` (outline)
- **Tertiary** — `Watch Demo` (text + icon)

Primary appears: Hero, after Video, end of Manufacturer Intro, end of Technology, end of Products, in sticky mobile bar.

### Phase 2 verification gate

- `pnpm build` + `pnpm lint` clean
- Hydration clean
- CLS check: hero video block must reserve aspect-ratio so layout doesn't shift on load
- Mobile spacing audit on iPhone SE, Pixel 6, iPad Air widths
- Keyword diff: confirm every previous keyword still on the page somewhere
- Lighthouse run on `/` — score does not regress
- Commit Phase 2 before moving to Phase 3

---

## Phase 3 — AI SEO Optimization

**Goal:** Restructure the homepage so AI search engines (Overviews, ChatGPT, Perplexity, Gemini) cite us — not just rank us. Optimize for **semantic authority**, not keyword density.

### Requirements

- **Semantic topic clusters** — homepage links to a small set of pillar pages, each pillar links back. Group: thermal fogging technology, GeM/government procurement, agricultural use cases, vector-borne disease control.
- **FAQ-rich entities** — expand FAQ section with entity-rich questions (definitions, comparisons, applications). Each answer is self-contained and cite-worthy.
- **Heading hierarchy** — strict single `<h1>`; section headings `<h2>`; subsections `<h3>`. No skipped levels. Lint-checked.
- **Contextual internal linking** — body copy links to product pages, state landings, and blog posts using descriptive anchor text (not "click here").
- **E-E-A-T signals** — surface manufacturer experience (years), expertise (engineering depth), authority (GeM OEM), trust (10,000+ customers, named municipal clients). All visible, not hidden.
- **Structured data** — extend existing JSON-LD: add `Organization`, `Product` (per featured product), `FAQPage`, `BreadcrumbList`, `VideoObject` (hero video), `HowTo` (technology explainer). Validate with Rich Results Test.
- **Reduce keyword stuffing** — remove residual phrases that read like SEO stuffing ("trusted thermal fogging machine manufacturer in India" appearing 5+ times). Each keyword phrase appears at most twice in visible body copy; remainder lives in JSON-LD and meta.
- **Readability score** — body copy aims for Flesch reading ease ≥ 60.
- **Geo authority signals** — list of Indian states/regions served with brief context, linked to state-level landing pages where they exist.

### What this phase explicitly does NOT do

- Does not rewrite copy back into long paragraphs to "match SEO best practices"
- Does not add hidden keyword blocks (`display:none` paragraphs)
- Does not add link-stuffed footers
- Does not let any SEO requirement override the buyer-first section order from Phase 2

### Phase 3 verification gate

- Rich Results Test: all structured data validates
- Heading hierarchy linter: no skipped levels
- Each previous keyword still present (visible body, alt text, or JSON-LD)
- Readability check on each block of body copy
- Commit Phase 3 before moving to Phase 4

---

## Phase 4 — Conversion Optimization

**Goal:** Increase qualified inquiries from the four buyer segments: municipal, pest control companies, agriculture distributors, government tenders, and export buyers.

### Additions

- **Sticky WhatsApp CTA** — already exists (`WhatsAppFloatingButton`); audit positioning and ensure it never overlaps the sticky mobile CTA bar
- **Inquiry CTA repetition** — primary inquiry CTA after each major section (Hero, Video, Manufacturer Intro, Technology, Products)
- **Trust badges** — accreditations strip visible above the fold equivalent on mobile; show count of municipalities served
- **Government supply proof** — short "Trusted by 200+ Nagar Nigams and Municipal Bodies" callout (specific number sourced from sales)
- **Certifications visibility** — GeM, BIS, ISO badges visible inline (not buried in footer)
- **Testimonial credibility** — testimonials show customer org name + location + role where possible
- **Factory / manufacturing positioning** — small "Manufactured in Gurugram" badge somewhere prominent; one factory photo or short video clip on the Technology block
- **Made-in-India positioning** — small tricolor accent or "Made in India" badge near hero CTA

### Buyer segment cues

The Products section gains light tabs or a quick-filter row labeled by buyer type: **Municipal · Agriculture · Pest Control · Export**. Each tab pre-filters which products show. No new pages created — same products, contextual presentation.

### Phase 4 verification gate

- `pnpm build` + `pnpm lint` clean
- Mobile and desktop CTA hierarchy audit — primary CTA reachable every 1–1.5 scroll-distances
- Sticky elements don't collide (WhatsApp button + mobile CTA bar)
- GA4 event coverage: every CTA fires a `cta_click` event with `section` and `label` params
- Commit Phase 4

---

## Process Constraints (apply to every phase)

- **Small commits** — never a single "redo the homepage" commit. Each phase is at minimum one commit; each new component or each section's content trim is its own commit where it makes sense.
- **Build + lint after every commit** — non-negotiable.
- **No phase starts before the previous phase's gate is green.**
- **Visual diff awareness** — keep the production homepage open in one tab and the dev homepage in another during Phases 2–4. Spot-check after each commit.
- **Mobile responsiveness check** every commit that touches layout.
- **Performance sanity check** at the end of each phase (Lighthouse on `/`, no regression).

---

## Out of Scope

- About page, Products page, Contact page (the wider site)
- Product landing pages (DB400, vehicle-mounted, power-tiller, /[slug])
- Blog page, blog post pages
- Legal pages
- Admin
- Refactoring the `currentPage` state-driven page switching inside `app/page.tsx` (worth doing, separate effort)

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Visual regression during Phase 1 extraction | Spot-check after every component move; keep dev + prod open side-by-side |
| Keyword loss during trimming | Inventory keywords before Phase 2; diff after each section trim |
| SEO ranking dip from removing keyword-stuffed paragraphs | Phase 3 compensates with structured data + semantic authority — only ship Phases 2 + 3 together if SEO team is anxious |
| CLS regression from hero video | Reserve aspect-ratio with CSS; lazy-load the iframe |
| Sticky CTA collision on mobile | Audit z-index and viewport offsets; test on real device widths |
| YouTube embed weight on mobile | Use click-to-play poster (not eager iframe) so the iframe loads on intent, not page load |
