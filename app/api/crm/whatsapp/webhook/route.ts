// WhatsApp Cloud API webhook for the fogging number (no Coexistence). Session-exempt in
// middleware.ts: authenticated by X-Hub-Signature-256 (POST) / verify token (GET).
// Logic lives in lib/crm/whatsapp/webhook.ts.
import { after, type NextRequest } from "next/server"
import { crmDb } from "@/lib/crm/db"
import { handleVerify, handleWebhookPost, requestIdOf, WEBHOOK_WORKSPACE } from "@/lib/crm/whatsapp/webhook"
import { consoleLogger } from "@/lib/crm/whatsapp/ingest"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  return handleVerify(new URL(request.url), undefined, consoleLogger(requestIdOf(request.headers)))
}

export async function POST(request: NextRequest) {
  return handleWebhookPost(request, {
    getDb: () => crmDb(WEBHOOK_WORKSPACE),
    schedule: task => after(task),
  })
}
