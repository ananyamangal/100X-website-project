import { test, expect } from "@playwright/test";

// Verifies the router.refresh() fix in LanguageSwitcher.tsx: switching
// locale via the client-side switcher (soft nav) must refresh the ambient
// next-intl context (NextIntlClientProvider lives in the root layout, above
// the [locale] segment) — otherwise LandingFormBlock's field labels and the
// switcher's own active-locale display keep showing the PREVIOUS locale
// even though the page body/hero/FAQ (sourced from the {locale} route param
// directly) update correctly.

const BASE = "http://localhost:3000";
const SLUG = "fogging-machine-supplier-in-bihar";
const SWITCHER = 'button[aria-haspopup="menu"]:not([data-nextjs-dev-tools-button])';

// Distinctive, non-cognate strings for each locale's "organization" and
// "name" form-field labels (tender-quote variant) — picked so a stale value
// from the OTHER locale is unambiguous, not just a shared Devanagari word.
const HI_ORG = "संगठन / विभाग";
const HI_NAME = "आपका नाम";
const MR_ORG = "संस्था / विभाग";
const MR_NAME = "तुमचे नाव";

// Footer's Footer.brandDescription — rendered server-side via getTranslations()
// using the `locale` prop threaded down from root layout's own getLocale()
// call, so it's exposed to the exact same root-layout staleness as the form
// labels (see components/SiteFooter.tsx + app/layout.tsx). Fully distinct
// strings per locale, easy to assert on unambiguously.
const HI_FOOTER = "सार्वजनिक स्वास्थ्य, नगरपालिकाओं, कृषि और औद्योगिक कीट नियंत्रण के लिए थर्मल फॉगिंग मशीनों का भारत का भरोसेमंद निर्माता।";
const MR_FOOTER = "सार्वजनिक आरोग्य, महानगरपालिका, कृषी आणि औद्योगिक कीटक नियंत्रणासाठी थर्मल फॉगिंग मशीन्सचा भारतातील विश्वासार्ह उत्पादक.";

async function openSwitcherAndSelect(page: import("@playwright/test").Page, labelText: string) {
  const trigger = page.locator(SWITCHER);
  await expect(trigger).toBeVisible({ timeout: 10_000 });
  await trigger.click();
  const item = page.locator('button[role="menuitemradio"]', { hasText: labelText });
  await expect(item).toBeVisible({ timeout: 5_000 });
  await item.click();
}

test.describe("LanguageSwitcher stale-locale fix (router.refresh)", () => {
  test("hi -> mr (soft nav): form labels and switcher update to Marathi, not stale Hindi", async ({ page }) => {
    await page.goto(`${BASE}/hi/${SLUG}`, { waitUntil: "load" });

    // Sanity: hard-loaded Hindi page shows correct Hindi form labels.
    await expect(page.getByText(HI_ORG)).toBeVisible();
    await expect(page.getByText(HI_NAME)).toBeVisible();

    await openSwitcherAndSelect(page, "मराठी");
    await page.waitForURL(/\/mr\//, { timeout: 10_000 });
    await page.waitForLoadState("load");

    // Form labels must now be Marathi, not stale Hindi.
    await expect(page.getByText(MR_ORG), "organization label should be Marathi").toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(MR_NAME), "name label should be Marathi").toBeVisible();
    await expect(page.getByText(HI_ORG), "stale Hindi organization label must be gone").toHaveCount(0);
    await expect(page.getByText(HI_NAME), "stale Hindi name label must be gone").toHaveCount(0);

    // Corroborating symptom: switcher's own active-locale display updates too.
    const trigger = page.locator(SWITCHER);
    await expect(trigger.getByText("मराठी")).toBeVisible();

    // Footer (also root-layout-scoped) must update too.
    await page.locator("footer").scrollIntoViewIfNeeded();
    await expect(page.getByText(MR_FOOTER), "footer should be Marathi").toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(HI_FOOTER), "stale Hindi footer must be gone").toHaveCount(0);

    await page.screenshot({ path: "test-results/switcher-hi-to-mr-after.png", fullPage: false });
  });

  test("mr -> hi (soft nav, reverse direction): form labels update to Hindi, not stale Marathi", async ({ page }) => {
    await page.goto(`${BASE}/mr/${SLUG}`, { waitUntil: "load" });

    await expect(page.getByText(MR_ORG)).toBeVisible();
    await expect(page.getByText(MR_NAME)).toBeVisible();

    await openSwitcherAndSelect(page, "हिंदी");
    await page.waitForURL(/\/hi\//, { timeout: 10_000 });
    await page.waitForLoadState("load");

    await expect(page.getByText(HI_ORG), "organization label should be Hindi").toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(HI_NAME), "name label should be Hindi").toBeVisible();
    await expect(page.getByText(MR_ORG), "stale Marathi organization label must be gone").toHaveCount(0);
    await expect(page.getByText(MR_NAME), "stale Marathi name label must be gone").toHaveCount(0);

    const trigger = page.locator(SWITCHER);
    await expect(trigger.getByText("हिंदी")).toBeVisible();

    await page.locator("footer").scrollIntoViewIfNeeded();
    await expect(page.getByText(HI_FOOTER), "footer should be Hindi").toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(MR_FOOTER), "stale Marathi footer must be gone").toHaveCount(0);

    await page.screenshot({ path: "test-results/switcher-mr-to-hi-after.png", fullPage: false });
  });

  test("regression: excluded product page (TFS50) switcher stays a static non-interactive label", async ({ page }) => {
    // type:"product" landing pages (TFS50/DB400/SSMA20) have no locale
    // translations at all — the switcher must render the static, non-
    // clickable label branch (availableLocales.length <= 1), not a dropdown
    // that would dead-end. router.refresh() only runs inside the dropdown's
    // onClick, so this branch should be completely unaffected by the fix.
    await page.goto(`${BASE}/thermal-and-cold-fogging-machine-100xtfs50`, { waitUntil: "load" });

    const dropdownTrigger = page.locator(SWITCHER);
    await expect(dropdownTrigger, "no interactive dropdown should render on an untranslated product page").toHaveCount(0);
    await expect(page.locator('[role="menu"]')).toHaveCount(0);
    await expect(page.getByText("English", { exact: true }).first()).toBeVisible();
  });
});
