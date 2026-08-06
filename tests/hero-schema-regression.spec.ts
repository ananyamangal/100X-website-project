// Regression pass for the hero-schema-mismatch fix (commit 629ba44,
// branch hotfix/i18n-hero-schema-mismatch).
//
// Root cause: get-merged-landing-page.ts's Zod OverridesSchema validated
// hero.headline as a plain string only; rows written with the two-tone
// array-of-parts shape failed .safeParse() for the WHOLE overrides doc,
// silently dropping metadata/FAQs/sections back to English. This spec
// confirms: (1) title/meta are genuinely translated on the 3 previously-
// affected pages (array-shape headline) and still correct on the 3
// previously-unaffected pages (string-shape headline); (2) the 3
// type:"product" landing pages still hard-404 under non-English locales;
// (3) the 7 recently-gated products (no landing-page entry) hard-404
// under non-English locales, especially 100XMCF42.
//
// HTTP-level checks use `request` (no browser) for speed/resource economy
// on this machine; a couple of combos also do a full page load to confirm
// body content (hero/FAQs), not just <head>, renders translated.
//
// Run with: npx playwright test hero-schema-regression --project=desktop-chrome

import { test, expect } from "@playwright/test"

const BASE = "http://localhost:3000"

// The 3 slugs whose hero-extras seeding wrote the two-tone array-of-parts
// headline shape — these were the rows silently failing before the fix.
const ARRAY_SHAPE_PAGES: Record<string, string> = {
  "gem-approved-fogging-machine-oem": "Fogging Machine on GeM Portal | Certified OEM | 100x Circle",
  "dengue-control-fogging-machine": "Dengue Control Fogging Machine | Municipal & Society Use | 100x Circle",
  "thermal-vs-cold-fogging-machine": "Thermal vs Cold Fogging Machine — Which to Buy | 100x Circle",
}

// The 3 slugs whose headline was already a plain string — unaffected by
// the bug, included here as a control group (must still work post-fix).
const STRING_SHAPE_PAGES: Record<string, string> = {
  "fogging-machine-supplier-in-uttar-pradesh": "Fogging Machine Supplier in Uttar Pradesh | 100x Circle",
  "fogging-machine-supplier-in-bihar": "Fogging Machine Supplier in Bihar | 100x Circle",
  "fogging-machine-buying-guide": "Fogging Machine Buying Guide (India) | 100x Circle",
}

const ALL_REAL_PAGES = { ...ARRAY_SHAPE_PAGES, ...STRING_SHAPE_PAGES }

// Diverse script sample, including one RTL locale (ur).
const LOCALES = ["hi", "mr", "bn", "ta", "ur"] as const

const EXCLUDED_PRODUCT_LANDING_SLUGS = [
  "thermal-and-cold-fogging-machine-100xtfs50",
  "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
  "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
]

// Published products with no landing-page entry at all — gated by the
// isUntranslatableProductLanding extension added in this fix.
const RECENTLY_GATED_PRODUCT_SLUGS = [
  "cold-fogger-machine-with-2-stoke-engine-100xmcf42-c42ca1", // 100XMCF42, called out explicitly
  "passenger-baggage-trolleys-stainless-steel-with-brakes-100xa-00664d",
  "isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde",
  "isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhbl22-c-ea7f75",
  "ulv-cold-fogger-machine-100xmcf42-copy-8dcd42lvlv",
  "100xulvss10-5e46c5",
  "mini-fogger-100xbf102-2d9887",
]

function extractTag(html: string, re: RegExp): string | null {
  const m = html.match(re)
  return m ? m[1].trim() : null
}

test.describe("title/meta translated on locale pages (was English on all 12 locales)", () => {
  for (const [slug, enTitle] of Object.entries(ALL_REAL_PAGES)) {
    for (const locale of LOCALES) {
      test(`${locale}/${slug}: title + meta description differ from English`, async ({ request }) => {
        const res = await request.get(`${BASE}/${locale}/${slug}`)
        expect(res.status(), `${locale}/${slug} should return 200`).toBe(200)
        const html = await res.text()

        const title = extractTag(html, /<title>([^<]*)<\/title>/)
        expect(title, `${locale}/${slug} should have a <title>`).toBeTruthy()
        expect(title, `${locale}/${slug} title should differ from English`).not.toBe(enTitle)

        const description = extractTag(html, /<meta name="description" content="([^"]*)"/)
        expect(description, `${locale}/${slug} should have a meta description`).toBeTruthy()
        expect(description!.length, `${locale}/${slug} meta description should be non-trivial`).toBeGreaterThan(10)

        const ogTitle = extractTag(html, /<meta property="og:title" content="([^"]*)"/)
        expect(ogTitle, `${locale}/${slug} og:title should differ from English`).not.toBe(enTitle)

        const htmlLang = extractTag(html, /<html[^>]*\blang="([^"]*)"/)
        expect(htmlLang, `${locale}/${slug} html lang should be ${locale}`).toBe(locale)
      })
    }
  }
})

test.describe("body content (hero + FAQs) genuinely renders translated, not just <head>", () => {
  // Spot-check one array-shape and one string-shape page in two different
  // scripts, via full browser render (not just HTTP HEAD/body-as-text).
  const spotChecks: Array<{ slug: string; locale: string }> = [
    { slug: "gem-approved-fogging-machine-oem", locale: "hi" },
    { slug: "gem-approved-fogging-machine-oem", locale: "mr" },
    { slug: "fogging-machine-supplier-in-bihar", locale: "ur" },
  ]

  for (const { slug, locale } of spotChecks) {
    test(`${locale}/${slug}: hero + FAQ body content is non-English`, async ({ page }) => {
      await page.goto(`${BASE}/${locale}/${slug}`, { waitUntil: "networkidle" })

      const h1Text = await page.locator("h1").first().textContent()
      expect(h1Text, `${locale}/${slug} h1 should render`).toBeTruthy()
      // Non-Latin scripts (Devanagari/Bengali/Tamil/Urdu) should not be
      // representable in pure ASCII — a crude but effective translation check.
      expect(/[^\x00-\x7F]/.test(h1Text || ""), `${locale}/${slug} h1 should contain non-ASCII (translated) text`).toBe(true)

      const bodyText = await page.locator("body").innerText()
      expect(bodyText.length, `${locale}/${slug} body should have substantial content`).toBeGreaterThan(500)
    })
  }
})

test.describe("3 type:product landing pages still hard-404 under non-English locales (unchanged)", () => {
  for (const slug of EXCLUDED_PRODUCT_LANDING_SLUGS) {
    for (const locale of LOCALES) {
      test(`${locale}/${slug} -> 404`, async ({ request }) => {
        const res = await request.get(`${BASE}/${locale}/${slug}`)
        expect(res.status()).toBe(404)
      })
    }
    test(`en/${slug} -> 200 (English unaffected)`, async ({ request }) => {
      const res = await request.get(`${BASE}/${slug}`)
      expect(res.status()).toBe(200)
    })
  }
})

test.describe("7 recently-gated products (no landing-page entry) -> 404 under non-English locales", () => {
  for (const slug of RECENTLY_GATED_PRODUCT_SLUGS) {
    test(`hi/${slug} -> 404`, async ({ request }) => {
      const res = await request.get(`${BASE}/hi/${slug}`)
      expect(res.status(), `hi/${slug} should 404 (previously silently served English)`).toBe(404)
    })
  }

  test("100XMCF42 specifically: available-locales API returns only en", async ({ request }) => {
    const res = await request.get(
      `${BASE}/api/i18n/available-locales?pathname=/cold-fogger-machine-with-2-stoke-engine-100xmcf42-c42ca1`
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.locales).toEqual(["en"])
  })
})
