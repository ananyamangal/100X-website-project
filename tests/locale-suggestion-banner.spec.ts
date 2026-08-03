import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";
const REAL_CONTENT_SLUG = "dengue-control-fogging-machine"; // has hi/id content
const EXCLUDED_SLUG = "thermal-and-cold-fogging-machine-100xtfs50"; // no hi/id content
const UNTRANSLATED_BLOG_SLUG = "how-to-buy-fogging-machines-on-gem-portal-a-complete-guide";

test.describe("locale suggestion banner", () => {
  test.use({ locale: "hi-IN" }); // navigator.language / navigator.languages report hi-IN first

  test("suggests Hindi on a real-content landing page when browser language is Hindi", async ({ page }) => {
    await page.goto(`${BASE}/${REAL_CONTENT_SLUG}`, { waitUntil: "domcontentloaded" });
    const banner = page.getByRole("status").filter({ hasText: "available in" });
    await expect(banner).toBeVisible({ timeout: 5000 });
    await expect(banner).toContainText("हिंदी");
  });

  test("dismissal persists across reload (localStorage)", async ({ page }) => {
    await page.goto(`${BASE}/${REAL_CONTENT_SLUG}`, { waitUntil: "domcontentloaded" });
    const banner = page.getByRole("status").filter({ hasText: "available in" });
    await expect(banner).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Dismiss language suggestion" }).click();
    await expect(banner).toHaveCount(0);
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByRole("status").filter({ hasText: "available in" })).toHaveCount(0);
  });

  test("clicking the suggestion navigates to the suggested locale (no auto-redirect)", async ({ page }) => {
    await page.goto(`${BASE}/${REAL_CONTENT_SLUG}`, { waitUntil: "domcontentloaded" });
    // Must NOT have already navigated on its own before any click.
    expect(new URL(page.url()).pathname).toBe(`/${REAL_CONTENT_SLUG}`);
    const banner = page.getByRole("status").filter({ hasText: "available in" });
    await expect(banner).toBeVisible({ timeout: 5000 });
    await banner.getByRole("button", { name: /View in/ }).click();
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle").catch(() => {});
    expect(new URL(page.url()).pathname).toBe(`/hi/${REAL_CONTENT_SLUG}`);
  });

  test("never appears on an excluded product-type page", async ({ page }) => {
    await page.goto(`${BASE}/${EXCLUDED_SLUG}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    await expect(page.getByRole("status").filter({ hasText: "available in" })).toHaveCount(0);
  });

  test("never appears on a blog post with no translation", async ({ page }) => {
    await page.goto(`${BASE}/blog/${UNTRANSLATED_BLOG_SLUG}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1000);
    await expect(page.getByRole("status").filter({ hasText: "available in" })).toHaveCount(0);
  });
});

test("banner never appears in server-rendered HTML (view-source, no browser/JS)", async ({ request }) => {
  const resp = await request.get(`${BASE}/${REAL_CONTENT_SLUG}`, {
    headers: { "Accept-Language": "hi-IN,hi;q=0.9" },
  });
  const html = await resp.text();
  // Note: the RSC payload legitimately references the client component's
  // module path (e.g. "LocaleSuggestionBanner.tsx" in a webpack-internal://
  // comment) so it knows what to hydrate — that's not rendered content. The
  // real assertion is that none of the banner's actual visible text/markup
  // ever appears in the raw server response.
  expect(html).not.toContain("available in");
  expect(html).not.toContain("View in हिंदी");
  expect(html).not.toContain("Dismiss language suggestion");
});
