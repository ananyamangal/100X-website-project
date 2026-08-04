import { test, expect } from "@playwright/test";
import { execFileSync } from "child_process";
import path from "path";

const BASE = "http://localhost:3000";
const SWITCHER = 'button[aria-haspopup="menu"]:not([data-nextjs-dev-tools-button])';

// One page with hi/id reviewed:true; used as the flip target so we exercise
// a slug that already has other reviewed locales, not just the flipped one.
const SLUG = "fogging-machine-buying-guide";
// Tamil (ta) is one of the 11 languages seeded on this branch with
// reviewed:false — a real, previously-unreviewed row we flip live.
const FLIP_LOCALE = "ta";

const SCRIPT = path.resolve(__dirname, "..", "scripts", "publish-i18n-translation.mjs");

function publish(slug: string, locale: string) {
  execFileSync("node", [SCRIPT, slug, locale], { stdio: "pipe" });
}
function unpublish(slug: string, locale: string) {
  execFileSync("node", [SCRIPT, "--unpublish", slug, locale], { stdio: "pipe" });
}

async function readMenuItems(page: import("@playwright/test").Page) {
  await page.goto(`${BASE}/${SLUG}`, { waitUntil: "networkidle" });
  const trigger = page.locator(SWITCHER);
  await expect(trigger).toBeVisible({ timeout: 5000 });
  await trigger.click();
  const items = page.locator('button[role="menuitemradio"]');
  await expect(items.first()).toBeVisible();
  return items.allTextContents();
}

test.describe.serial("LanguageSwitcher live gating (points 2 & 3)", () => {
  test.afterAll(() => {
    // Belt-and-suspenders: guarantee the test row is unpublished even if a
    // mid-test assertion throws before the explicit unpublish step runs.
    try {
      unpublish(SLUG, FLIP_LOCALE);
    } catch {
      /* already unpublished */
    }
  });

  test("point 2: flipping a seeded row to reviewed:true makes it appear with zero code changes", async ({ page }) => {
    const before = await readMenuItems(page);
    expect(before).toEqual(["English", "हिंदी", "Bahasa Indonesia"]);

    publish(SLUG, FLIP_LOCALE);

    // No code change, no server restart — only re-navigating so the client
    // component re-fetches /api/i18n/available-locales.
    const after = await readMenuItems(page);
    expect(after).toEqual(["English", "हिंदी", "Bahasa Indonesia", "தமிழ்"]);
  });

  test("point 3: flipping it back to reviewed:false removes it again", async ({ page }) => {
    // Re-assert it's still published from point 2 (serial dependency), then revert.
    const stillThere = await readMenuItems(page);
    expect(stillThere).toContain("தமிழ்");

    unpublish(SLUG, FLIP_LOCALE);

    const after = await readMenuItems(page);
    expect(after).toEqual(["English", "हिंदी", "Bahasa Indonesia"]);
  });
});

test.describe("LanguageSwitcher failure path (point 4)", () => {
  test("endpoint failure falls back to English-only, no crash, no stale/unreviewed data", async ({ page }) => {
    // Load once normally first so we can see a real dropdown, then reload
    // with the endpoint mocked to fail — proves it's not just "always
    // English by default" but an actual fallback from a broken fetch.
    const before = await readMenuItems(page);
    expect(before.length).toBeGreaterThan(1);

    await page.route("**/api/i18n/available-locales**", (route) => route.abort("failed"));

    await page.goto(`${BASE}/${SLUG}`, { waitUntil: "networkidle" });

    // No JS crash: page rendered, no dropdown trigger with a broken menu.
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    // Falls back to the static English-only label (availableLocales.length <= 1 branch).
    const trigger = page.locator(SWITCHER);
    await expect(trigger, "no interactive dropdown should render when the endpoint fails").toHaveCount(0);
    await expect(page.getByText("English", { exact: true }).first()).toBeVisible();
    await expect(page.locator('[role="menu"]')).toHaveCount(0);

    await page.waitForTimeout(500);
    expect(errors, "no uncaught JS errors from the failed fetch").toEqual([]);

    // Unroute and confirm a normal reload recovers the full dropdown again
    // (i.e. this was a live fallback, not a page stuck in a broken state).
    await page.unroute("**/api/i18n/available-locales**");
    const recovered = await readMenuItems(page);
    expect(recovered).toEqual(["English", "हिंदी", "Bahasa Indonesia"]);
  });
});
