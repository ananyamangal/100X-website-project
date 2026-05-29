import { type NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import clientPromise from "@/lib/mongodb"

function hashPw(password: string): string {
  return createHash("sha256").update(`100x-admin-v1:${password}`).digest("hex")
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Accept either { username, password } (legacy) or { password } only
    const password = body.password || ""

    // Check MongoDB override hash first
    try {
      const client = await clientPromise
      const db = client.db()
      const settings = await db.collection("admin_settings").findOne({ key: "password" })
      if (settings?.hash && hashPw(password) === String(settings.hash)) {
        const response = NextResponse.json({ success: true })
        response.cookies.set("admin-token", "authenticated", {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 60 * 60 * 24,
          path: "/admin",
        })
        return response
      }
    } catch {
      // MongoDB unavailable — fall through to env/hardcoded check
    }

    // Fall back to env var or hardcoded default
    const envPassword = process.env.ADMIN_PASSWORD || "dtu@ananya"
    if (password === envPassword) {
      const response = NextResponse.json({ success: true })
      response.cookies.set("admin-token", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24,
        path: "/admin",
      })
      return response
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
  } catch (error) {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
