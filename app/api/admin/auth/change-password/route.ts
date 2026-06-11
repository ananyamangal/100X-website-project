import { NextRequest, NextResponse } from "next/server"
import { createHash } from "crypto"
import clientPromise from "@/lib/mongodb"

function hashPw(password: string): string {
  return createHash("sha256").update(`100x-admin-v1:${password}`).digest("hex")
}

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Both passwords are required" }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 })
    }

    const client = await clientPromise
    const db = client.db()
    const settings = await db.collection("admin_settings").findOne({ key: "password" })

    // Determine what the valid current password is
    const storedHash = settings?.hash as string | undefined
    const envPassword = process.env.ADMIN_PASSWORD
    if (!storedHash && !envPassword) {
      return NextResponse.json({ error: "No admin password configured" }, { status: 500 })
    }
    const currentIsValid = storedHash
      ? hashPw(currentPassword) === storedHash
      : currentPassword === envPassword

    if (!currentIsValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 })
    }

    // Store new password hash
    await db.collection("admin_settings").updateOne(
      { key: "password" },
      { $set: { key: "password", hash: hashPw(newPassword), updatedAt: new Date() } },
      { upsert: true }
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("Change password error:", err)
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
  }
}
