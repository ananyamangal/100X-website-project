// Fake next/server: the real NextRequest/NextResponse, with after() queued for the test
// to flush (the real one needs a Next.js request scope).
import real from "next/server.js"
import { state } from "./state.mjs"

export const NextRequest = real.NextRequest
export const NextResponse = real.NextResponse
export function after(fn) {
  state.afterQueue.push(typeof fn === "function" ? fn : () => fn)
}
