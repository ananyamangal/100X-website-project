import { test, expect, type Page } from "@playwright/test"

// A3/A4 stand-in submits: contact form (optional email, call-back) and the GeM landing form
// (buyer / reseller role, call-back). Every /api POST is intercepted, so nothing is written.
// Run against a production build: CI=1 BASE_URL=http://localhost:3104 npx playwright test tests/lead-forms-standin.spec.ts

type Body = Record<string, unknown>

// Centre the button first: on phones the fixed header / bottom CTA bar can cover an edge-scrolled button,
// and the floating product video (if shown) can cover a centred one, so close it like a visitor would.
async function submit(form: import("@playwright/test").Locator) {
  const closeVideo = form.page().getByRole("button", { name: /close video/i })
  if (await closeVideo.isVisible()) await closeVideo.click()
  const btn = form.locator('button[type="submit"]')
  await btn.evaluate((el) => el.scrollIntoView({ block: "center" }))
  await btn.click()
}

async function intercept(page: Page) {
  const bodies: Body[] = []
  await page.route("**/api/**", async (route) => {
    const req = route.request()
    if (req.method() === "GET") return route.continue()
    if (req.url().includes("/api/submissions")) {
      try { bodies.push(JSON.parse(req.postData() || "{}")) } catch { bodies.push({}) }
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: '{"success":true}' })
  })
  return bodies
}

test.describe("contact form", () => {
  test("enquiry with optional email posts type contact", async ({ page }) => {
    const bodies = await intercept(page)
    await page.goto("/contact-us")
    const form = page.locator("#contact-inquiry-form")
    await form.locator("#contact-name").fill("Playwright Test")
    await form.locator("#contact-phone").fill("9999999999")
    await form.locator("#contact-email").fill("pw@example.com")
    await page.waitForTimeout(2200) // 2 s bot time-gate
    await submit(form)
    await expect.poll(() => bodies.length).toBe(1)
    expect(bodies[0]).toMatchObject({ type: "contact", email: "pw@example.com", name: "Playwright Test" })
  })

  test("call back posts type callback with the chosen slot", async ({ page }) => {
    const bodies = await intercept(page)
    await page.goto("/contact-us")
    const form = page.locator("#contact-inquiry-form")
    await form.locator("#contact-name").fill("Playwright Test")
    await form.locator("#contact-phone").fill("9999999999")
    await form.locator("#contact-callback").check()
    const slot = form.locator("#contact-callback-slot")
    await slot.selectOption({ index: 1 })
    await page.waitForTimeout(2200)
    await submit(form)
    await expect.poll(() => bodies.length).toBe(1)
    expect(bodies[0]).toMatchObject({ type: "callback", source_form: "contact" })
    expect(String(bodies[0].callback_slot || "")).not.toBe("")
  })
})

test.describe("GeM landing form", () => {
  const url = "/hi/gem-approved-fogging-machine-oem"

  test("buyer role shows department fields and sends buyer_role", async ({ page }) => {
    const bodies = await intercept(page)
    await page.goto(url)
    const radio = page.locator('input[name="buyer_role"][value="buyer"]')
    await radio.scrollIntoViewIfNeeded()
    await radio.check()
    const form = radio.locator("xpath=ancestor::form")
    await expect(form.locator('[name="department"]')).toBeVisible()
    await form.locator('[name="department"]').fill("Nagar Nigam Test")
    await form.locator('[name="name"]').fill("Playwright Officer")
    await form.locator('[name="mobile"]').fill("9999999999")
    await form.locator('[name="state"]').fill("Haryana")
    await page.waitForTimeout(2200)
    await submit(form)
    await expect.poll(() => bodies.length).toBe(1)
    expect(bodies[0]).toMatchObject({ buyer_role: "buyer" })
  })

  test("call back posts type callback", async ({ page }) => {
    const bodies = await intercept(page)
    await page.goto(url)
    const radio = page.locator('input[name="buyer_role"][value="reseller"]')
    await radio.scrollIntoViewIfNeeded()
    const form = radio.locator("xpath=ancestor::form")
    await form.locator('input[type="checkbox"]').first().check()
    await form.locator('[name="name"]').fill("Playwright Test")
    await form.locator('[name="mobile"]').fill("9999999999")
    await form.locator("#lf-callback_slot").selectOption({ index: 1 })
    await page.waitForTimeout(2200)
    await submit(form)
    await expect.poll(() => bodies.length).toBe(1)
    expect(bodies[0]).toMatchObject({ type: "callback" })
  })
})
