import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

// TFS50/DB400/SSMA20 — "type":"product" landing pages that render straight
// from the live Mongo product doc, no translation mechanism, hi/id 404.
// The switcher must show a static "English" label here, not a dropdown
// offering options that dead-end in a 404.
const EXCLUDED_SLUGS = [
  "thermal-and-cold-fogging-machine-100xtfs50",
  "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
  "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
];

// Real-content Phase 1 pages that DO have hi/id translations — the switcher
// must keep offering the full 3-locale dropdown here. Covers the 2 pages
// from the original spot-check plus 3 more, since the excluded-page bug
// was specifically missed by only testing 2 pages of one type.
const AVAILABLE_SLUGS = [
  "gem-approved-fogging-machine-oem",
  "fogging-machine-supplier-in-bihar",
  "dengue-control-fogging-machine",
  "thermal-vs-cold-fogging-machine",
  "fogging-machine-supplier-in-uttar-pradesh",
];

const SWITCHER = 'button[aria-haspopup="menu"]:not([data-nextjs-dev-tools-button])';

for (const slug of EXCLUDED_SLUGS) {
  test(`no dropdown / no locale options on excluded page: ${slug}`, async ({ page }) => {
    await page.goto(`${BASE}/${slug}`, { waitUntil: "networkidle" });

    // No interactive switcher trigger at all.
    const trigger = page.locator(SWITCHER);
    await expect(trigger, "should be no clickable switcher trigger on an excluded page").toHaveCount(0);

    // A static "English" label is present instead (not a dropdown).
    await expect(page.getByText("English", { exact: true }).first()).toBeVisible();

    // No menu items reachable by any interaction.
    await expect(page.locator('[role="menu"]')).toHaveCount(0);
    await expect(page.locator('button[role="menuitemradio"]')).toHaveCount(0);

    // Direct nav to hi/id still 404s (unchanged, sanity re-check).
    const hiResp = await page.goto(`${BASE}/hi/${slug}`);
    expect(hiResp?.status()).toBe(404);
  });
}

for (const slug of AVAILABLE_SLUGS) {
  test(`dropdown still offers all 3 locales, no regression: ${slug}`, async ({ page }) => {
    await page.goto(`${BASE}/${slug}`, { waitUntil: "networkidle" });

    const trigger = page.locator(SWITCHER);
    await expect(trigger, `switcher trigger should render on ${slug}`).toBeVisible({ timeout: 5000 });
    await trigger.click();

    const items = await page.locator('button[role="menuitemradio"]').allTextContents();
    expect(items).toEqual(["English", "हिंदी", "Bahasa Indonesia"]);

    // Confirm English switch still lands on the bare canonical (no regression
    // from the availableLocales filtering change).
    const englishItem = page.locator('button[role="menuitemradio"]', { hasText: "English" });
    await englishItem.click();
    await page.waitForTimeout(1500);
    await page.waitForLoadState("networkidle").catch(() => {});
    expect(new URL(page.url()).pathname).toBe(`/${slug}`);
  });
}
