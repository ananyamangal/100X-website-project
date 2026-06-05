import { NextRequest, NextResponse } from "next/server"

export const maxDuration = 15

// Extract bid number from input (URL or direct bid number string)
function extractBidNumber(input: string): string | null {
  const match = input.match(/GEM\/\d{4}\/[A-Z]+\/\d+/i)
  return match ? match[0].toUpperCase() : null
}

// Strip HTML tags and collapse whitespace
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|tr|td|th|li|h[1-6]|section)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-IN,en;q=0.9,hi;q=0.8",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  Referer: "https://bidplus.gem.gov.in/all-bids",
}

async function tryFetch(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const ct = res.headers.get("content-type") || ""
    const raw = await res.text()
    if (raw.length < 500) return null // empty shell
    return ct.includes("json") ? raw : htmlToText(raw)
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { input }: { input: string } = await req.json()
    if (!input?.trim()) {
      return NextResponse.json({ success: false, error: "input required" }, { status: 400 })
    }

    const trimmed = input.trim()
    const bidNumber = extractBidNumber(trimmed)
    const isUrl = trimmed.startsWith("http://") || trimmed.startsWith("https://")

    const attempts: Array<() => Promise<string | null>> = []

    // If we have a bid number, try GeM search endpoint first
    if (bidNumber) {
      const searchUrl = `https://bidplus.gem.gov.in/bidding/bid/getBidsBySearch?searchedBid=${encodeURIComponent(bidNumber)}`
      attempts.push(() => tryFetch(searchUrl))
    }

    // If input is a URL, try it directly
    if (isUrl) {
      attempts.push(() => tryFetch(trimmed))
    }

    // Try each attempt in sequence
    for (const attempt of attempts) {
      const text = await attempt()
      if (text && text.length > 200) {
        return NextResponse.json({
          success: true,
          text,
          bid_number: bidNumber,
          source: "gem_fetch",
        })
      }
    }

    // All fetches failed — return the bid number at least so client can pre-fill
    return NextResponse.json({
      success: false,
      bid_number: bidNumber,
      error: "GeM page requires browser rendering. Paste the page text below.",
    })
  } catch (err) {
    console.error("procurement/collect error:", err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
