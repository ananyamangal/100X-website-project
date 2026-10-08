import { test, expect } from "@playwright/test"

// Video popup click-to-load facade: until the visitor taps play, only the
// thumbnail renders and nothing is requested from YouTube's player. On tap the
// youtube-nocookie iframe mounts with autoplay and sound on.
// Run against a production build: CI=1 BASE_URL=http://localhost:3100 npx playwright test tests/video-popup-facade.spec.ts --project=desktop-chrome

const POPUP_CONFIG = {
  youtubeUrl: "https://www.youtube.com/watch?v=ZiVGNkvAI9g",
  orientation: "portrait",
  enabled: true,
  delayMs: 0,
  sessionOnce: true,
  showOnMobile: true,
  showOnDesktop: true,
  autoCloseMs: 0,
  hideOnPaths: [],
}

test("popup shows a thumbnail facade; the player loads only after tapping play", async ({ page }) => {
  const playerRequests: string[] = []
  await page.route("**/api/video-popup", (r) => r.fulfill({ json: POPUP_CONFIG }))
  await page.route(/youtube(-nocookie)?\.com\//, (r) => {
    playerRequests.push(r.request().url())
    return r.fulfill({ status: 200, contentType: "text/html", body: "<html></html>" })
  })
  await page.goto("/about")

  const play = page.getByRole("button", { name: "Play product video" })
  await expect(play).toBeVisible()
  await expect(play).toHaveAttribute("data-gtm", "video_popup_play")
  await expect(play.locator("img")).toHaveAttribute("src", "https://i.ytimg.com/vi/ZiVGNkvAI9g/hqdefault.jpg")
  await expect(page.locator('iframe[title="Product video"]')).toHaveCount(0)
  await expect(page.getByRole("button", { name: /mute video/i })).toHaveCount(0)
  await page.waitForTimeout(1500)
  expect(playerRequests).toEqual([])

  await play.click()
  const frame = page.locator('iframe[title="Product video"]')
  await expect(frame).toHaveCount(1)
  const src = (await frame.getAttribute("src"))!
  expect(src.startsWith("https://www.youtube-nocookie.com/embed/ZiVGNkvAI9g?")).toBe(true)
  expect(src).toContain("autoplay=1")
  expect(src).toContain("mute=0")
  await expect(page.getByRole("button", { name: "Mute video" })).toBeVisible()

  await page.getByRole("button", { name: /close video/i }).click()
  await expect(frame).toHaveCount(0)
})

// Any request to YouTube's player/video hosts. The poster thumbnail on
// i.ytimg.com is the facade itself and is allowed.
const PLAYER_HOSTS = /\/\/([a-z0-9-]+\.)?(youtube\.com|youtube-nocookie\.com|googlevideo\.com|ytimg\.com)\//

test("no player request before tap; keyboard opens the player; poster has fixed size; no layout shift", async ({ page }) => {
  const before: string[] = []
  let tapped = false
  await page.route("**/api/video-popup", (r) => r.fulfill({ json: POPUP_CONFIG }))
  page.on("request", (req) => {
    const u = req.url()
    if (!tapped && PLAYER_HOSTS.test(u) && !u.startsWith("https://i.ytimg.com/vi/")) before.push(u)
  })
  await page.route(/youtube(-nocookie)?\.com\//, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<html></html>" }))
  await page.addInitScript(() => {
    ;(window as unknown as { __cls: number }).__cls = 0
    new PerformanceObserver((l) => {
      for (const e of l.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) {
        if (!e.hadRecentInput) (window as unknown as { __cls: number }).__cls += e.value
      }
    }).observe({ type: "layout-shift", buffered: true })
  })
  await page.goto("/about")

  const play = page.getByRole("button", { name: "Play product video" })
  await expect(play).toBeVisible()
  const img = play.locator("img")
  await expect(img).toHaveAttribute("width", "480")
  await expect(img).toHaveAttribute("height", "360")
  const box1 = await play.boundingBox()
  await page.waitForTimeout(2000)
  const box2 = await play.boundingBox()
  expect(box2).toEqual(box1)
  expect(before).toEqual([])

  const clsBeforeTap = await page.evaluate(() => (window as unknown as { __cls: number }).__cls)
  tapped = true
  await play.focus()
  await page.keyboard.press("Enter")
  const frame = page.locator('iframe[title="Product video"]')
  await expect(frame).toHaveCount(1)
  const fbox = await frame.boundingBox()
  expect(Math.round(fbox!.width)).toBe(Math.round(box1!.width))
  expect(Math.round(fbox!.height)).toBe(Math.round(box1!.height))
  const clsAfter = await page.evaluate(() => (window as unknown as { __cls: number }).__cls)
  console.log(`[video-facade] ${test.info().project.name} cls_before_tap=${clsBeforeTap.toFixed(4)} cls_after_tap=${clsAfter.toFixed(4)} player_requests_before_tap=${before.length}`)
  expect(clsAfter - clsBeforeTap).toBeLessThan(0.001)
})

test("touch tap on the facade starts the player", async ({ page, browserName }, info) => {
  test.skip(!info.project.use.hasTouch, "touch-only")
  await page.route("**/api/video-popup", (r) => r.fulfill({ json: POPUP_CONFIG }))
  await page.route(/youtube(-nocookie)?\.com\//, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<html></html>" }))
  await page.goto("/about")
  const play = page.getByRole("button", { name: "Play product video" })
  await expect(play).toBeVisible()
  await play.tap()
  await expect(page.locator('iframe[title="Product video"]')).toHaveCount(1)
  void browserName
})
