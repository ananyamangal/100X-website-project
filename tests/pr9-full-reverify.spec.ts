import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";
const PAGES = [
  "gem-approved-fogging-machine-oem",
  "fogging-machine-supplier-in-bihar",
];
const LOCALES = ["hi", "id"] as const;
const LOCALE_LABELS: Record<string, string> = { en: "English", hi: "हिंदी", id: "Bahasa Indonesia" };

for (const slug of PAGES) {
  for (const locale of LOCALES) {
    test(`switcher round-trip: ${locale}/${slug}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      // 1. Load the locale page
      await page.goto(`${BASE}/${locale}/${slug}`, { waitUntil: "networkidle" });

      // 2. Switcher should render
      // (exclude Next.js dev-mode's own devtools button, which also uses
      // aria-haspopup="menu" and only exists in `next dev`, never in prod)
      const trigger = page.locator('button[aria-haspopup="menu"]:not([data-nextjs-dev-tools-button])');
      await expect(trigger, `switcher trigger should render on ${locale}/${slug}`).toBeVisible({ timeout: 5000 });

      // 3. Open menu, click English
      await trigger.click();
      const englishItem = page.locator('button[role="menuitemradio"]', { hasText: LOCALE_LABELS.en });
      await expect(englishItem).toBeVisible({ timeout: 3000 });
      await englishItem.click();

      // 4. Wait for client-side nav to settle (this is where the loop used to hang)
      await page.waitForTimeout(2000);
      await page.waitForLoadState("networkidle").catch(() => {});

      const urlAfterEn = new URL(page.url()).pathname;
      const expectedBare = `/${slug}`;
      const landedOnBareCanonical = urlAfterEn === expectedBare;

      // 5. Switcher still present + functional on the EN page
      const triggerAfterEn = page.locator('button[aria-haspopup="menu"]:not([data-nextjs-dev-tools-button])');
      const switcherPresentOnEn = await triggerAfterEn.isVisible().catch(() => false);

      // 6. Round-trip back to original locale
      let roundTripUrl = "";
      let roundTripOk = false;
      if (switcherPresentOnEn) {
        await triggerAfterEn.click();
        const localeItem = page.locator('button[role="menuitemradio"]', { hasText: LOCALE_LABELS[locale] });
        await localeItem.click();
        await page.waitForTimeout(2000);
        await page.waitForLoadState("networkidle").catch(() => {});
        roundTripUrl = new URL(page.url()).pathname;
        roundTripOk = roundTripUrl === `/${locale}/${slug}`;
      }

      const loopErrors = consoleErrors.filter((e) => e.includes("Maximum update depth"));

      console.log(
        `RESULT [${locale}/${slug}] urlAfterEnClick=${urlAfterEn} landedOnBareCanonical=${landedOnBareCanonical} ` +
        `switcherPresentOnEn=${switcherPresentOnEn} roundTripUrl=${roundTripUrl} roundTripOk=${roundTripOk} ` +
        `loopErrors=${loopErrors.length} totalConsoleErrors=${consoleErrors.length}`
      );
      if (consoleErrors.length) console.log(`  ALL console errors: ${JSON.stringify(consoleErrors)}`);

      expect(landedOnBareCanonical, `should land on bare canonical ${expectedBare}, got ${urlAfterEn}`).toBe(true);
      expect(switcherPresentOnEn, "switcher should still be present/functional on EN page").toBe(true);
      expect(roundTripOk, `round-trip back to /${locale}/${slug} should work, got ${roundTripUrl}`).toBe(true);
      expect(loopErrors.length, `should have 0 'Maximum update depth' errors, got ${loopErrors.length}: ${JSON.stringify(loopErrors)}`).toBe(0);
    });
  }
}
