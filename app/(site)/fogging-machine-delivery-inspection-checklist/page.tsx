// E5 (2026-10): new procurement guide. Content: lib/seo/procurement-guides.ts
import GuidePage, { guideMetadata } from "@/components/guides/GuidePage"
import { DELIVERY_ACCEPTANCE_CHECKLIST } from "@/lib/seo/procurement-guides"

export const revalidate = 3600

export const metadata = guideMetadata(DELIVERY_ACCEPTANCE_CHECKLIST)

export default function DeliveryInspectionChecklistPage() {
  return <GuidePage guide={DELIVERY_ACCEPTANCE_CHECKLIST} />
}
