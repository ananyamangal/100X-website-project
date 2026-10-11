// Internal notes (crm.notes.view / crm.notes.create) — the only route that reads note text. Logic: lib/crm/api/notes.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { createNoteHandler, listNotesHandler } from "@/lib/crm/api/notes"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const GET = (request: Request, ctx: { params: Promise<{ id: string }> }) => listNotesHandler(request, ctx, defaultCrmApiDeps)
export const POST = (request: Request, ctx: { params: Promise<{ id: string }> }) => createNoteHandler(request, ctx, defaultCrmApiDeps)
