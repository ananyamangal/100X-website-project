// Deal edits (assign, follow-up, product, customer type). Stage changes are STEP 4c. Logic: lib/crm/api/contacts.ts.
import { defaultCrmApiDeps } from "@/lib/crm/api/route"
import { patchDealHandler } from "@/lib/crm/api/contacts"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export const PATCH = (request: Request, ctx: { params: Promise<{ id: string }> }) => patchDealHandler(request, ctx, defaultCrmApiDeps)
