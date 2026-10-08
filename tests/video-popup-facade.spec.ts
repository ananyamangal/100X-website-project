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
