import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

// Landing-page path (LandingRenderer -> ProductAiSummary), the exact class of
// page the DB400 "[object Object]" bug was found on.
const LANDING_SLUGS = [
  "thermal-and-cold-fogging-machine-100xtfs50",
  "double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
  "thermal-fogging-machine-with-stainless-steel-tank-100xssma20",
];

// /products/[id] path (no dedicated landing page) -> same ProductAiSummary
// component, separate call site with its own features cast to fix.
const PRODUCT_IDS = [
  "6a3f5bfe5cc04246fbea7f75", // 100XHBL22
  "6917412ca57432be8ffcbbde", // 100XHM20
];

async function assertNoBrokenFeatures(page: import("@playwright/test").Page, url: string) {
  const resp = await page.goto(url, { waitUntil: "domcontentloaded" });
  expect(resp?.ok(), `${url} should load`).toBeTruthy();
  const html = await page.content();
  expect(html, `${url} should have no "[object Object]" leaks`).not.toContain("[object Object]");
  const dd = page.locator("dt", { hasText: "Key Features" }).locator("xpath=following-sibling::dd[1]");
  await expect(dd, `${url} Key Features dd should render`).toHaveCount(1);
  const text = await dd.textContent();
  expect(text, `${url} Key Features text`).not.toContain("[object Object]");
  expect(text?.trim().length || 0, `${url} Key Features should have real content`).toBeGreaterThan(0);
}

for (const slug of LANDING_SLUGS) {
  test(`landing page Key Features render correctly: ${slug}`, async ({ page }) => {
    await assertNoBrokenFeatures(page, `${BASE}/${slug}`);
  });
}

for (const id of PRODUCT_IDS) {
  test(`/products/[id] Key Features render correctly: ${id}`, async ({ page }) => {
    await assertNoBrokenFeatures(page, `${BASE}/products/${id}`);
  });
}
