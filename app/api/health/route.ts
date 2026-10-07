// Cheap health probe for the external uptime workflow (.github/workflows/uptime.yml).
// Static + ISR: prerendered at build and refreshed at most once a minute, so a probe
// every 10 minutes is served by the CDN and never touches MongoDB. A paused or broken
// deployment still fails this check (Vercel answers 402 / 5xx before any route runs).
export const dynamic = "force-static"
export const revalidate = 60

export function GET() {
  return Response.json(
    { ok: true, service: "100x-website", generatedAt: new Date().toISOString() },
    {
      headers: {
        "cache-control": "public, s-maxage=60, stale-while-revalidate=300",
        "x-robots-tag": "noindex, nofollow",
      },
    },
  )
}
