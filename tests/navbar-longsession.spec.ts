/**
 * Navbar long-session check — the navbar complaint never reproduced in the
 * short (0/2s/5s) timing checks used for the VideoPopup collision repro.
 * This runs a much longer dwell (35s+, past every known popup delay,
 * including RFQPopup's 30s delayMs even though it's currently disabled)
 * across multiple pages, then checks every visible navbar link's actual
 * click target via document.elementFromPoint().
 */
import { test, Page } from "@playwright/test"
import fs from "fs"
import path from "path"

const RESULTS_FILE = path.join(process.cwd(), "test-results", "navbar-longsession.log")
fs.mkdirSync(path.dirname(RESULTS_FILE), { recursive: true })
fs.writeFileSync(RESULTS_FILE, `Navbar long-session run — ${new Date().toISOString()}\nBASE_URL=${process.env.BASE_URL || "(default localhost)"}\n\n`)
function log(line: string) {
  fs.appendFileSync(RESULTS_FILE, line + "\n")
  console.log(line)
}

const PAGES = [
  "/",
  "/products/isi-marked-thermal-fogging-machine-with-hdpe-tank-100xhm20-fcbbde",
  "/double-barrel-thermal-fogging-machine-vehicle-mountable-100xdb400",
]
const DWELL_MS = 35000

async function checkNavLinks(page: Page) {
  return page.evaluate(() => {
    const links = Array.from(document.querySelectorAll<HTMLAnchorElement>("header nav a, header a[href]"))
    const vw = window.innerWidth
    const vh = window.innerHeight
    const results: { href: string; ok: boolean; got: string }[] = []
    for (const link of links) {
      const r = link.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue
      if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) continue
      const cx = Math.min(Math.max(r.left + r.width / 2, 0), vw - 1)
      const cy = Math.min(Math.max(r.top + r.height / 2, 0), vh - 1)
      const hit = document.elementFromPoint(cx, cy) as HTMLElement | null
      const ok = !!hit && (hit === link || link.contains(hit) || hit.contains(link))
      results.push({
        href: link.href,
        ok,
        got: hit ? `${hit.tagName}.${(hit.className || "").toString().slice(0, 80)}` : "null",
      })
    }
    return results
  })
}

let totalChecks = 0
let failedChecks = 0

for (const pagePath of PAGES) {
  test(`navbar after ${DWELL_MS}ms dwell @ ${pagePath}`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto(pagePath, { waitUntil: "domcontentloaded", timeout: 25000 })
    await page.waitForTimeout(DWELL_MS)
    totalChecks++
    const results = await checkNavLinks(page)
    const blocked = results.filter((r) => !r.ok)
    if (blocked.length > 0) {
      failedChecks++
      log(`[${pagePath}] BLOCKED ${blocked.length}/${results.length}: ${blocked.map((b) => `${b.href} -> ${b.got}`).join(" | ")}`)
    } else {
      log(`[${pagePath}] OK (${results.length} nav links checked after ${DWELL_MS}ms)`)
    }
  })
}

test.afterAll(async () => {
  log(`\n=== RUN COMPLETE — ${new Date().toISOString()} ===`)
  log(`TOTAL CHECKS: ${totalChecks}, FAILED: ${failedChecks}`)
})
