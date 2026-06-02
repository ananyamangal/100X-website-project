import { NextRequest, NextResponse } from "next/server"

const OID_PATTERN = /^[a-f0-9]{24}$/i

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl

  // Only intercept /products/{24-hex-chars} — legacy ObjectId URLs
  const match = pathname.match(/^\/products\/([a-f0-9]{24})$/i)
  if (!match) return NextResponse.next()

  const id = match[1]
  if (!OID_PATTERN.test(id)) return NextResponse.next()

  try {
    // Ask our own API for the slug (runs on same origin)
    const res = await fetch(`${origin}/api/debug-product?id=${id}`, {
      headers: { "x-middleware-internal": "1" },
    })
    if (!res.ok) return NextResponse.next()

    const data = await res.json()
    if (data.resolvedBy === "id" && data.slug && data.slug !== id) {
      const url = request.nextUrl.clone()
      url.pathname = `/products/${data.slug}`
      return NextResponse.redirect(url, { status: 308 })
    }
  } catch {
    // On any error, let the page handle it normally
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/products/:path*"],
}
