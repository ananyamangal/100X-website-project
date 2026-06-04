import { redirect } from "next/navigation"

// Server-side redirect — no client JS needed, no race condition with layout auth
export default function GrowthRoot() {
  redirect("/admin/growth/dashboard")
}
