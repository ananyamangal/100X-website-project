import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    // In production, verify against secure database
    // This is just for demo - NEVER hardcode credentials!
    const validCredentials = username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD

    if (validCredentials) {
      // In production, generate JWT token
      const response = NextResponse.json({ success: true })

      // Set secure HTTP-only cookie
      response.cookies.set("admin-token", "authenticated", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24, // 24 hours
        path: "/admin",
      })

      return response
    } else {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }
  } catch (error) {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 })
  }
}
