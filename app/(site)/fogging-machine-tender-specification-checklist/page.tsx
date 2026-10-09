// E5 (2026-10): new procurement guide. Content: lib/seo/procurement-guides.ts
import GuidePage, { guideMetadata } from "@/components/guides/GuidePage"
import { TENDER_SPEC_CHECKLIST } from "@/lib/seo/procurement-guides"

export const revalidate = 3600

export const metadata = guideMetadata(TENDER_SPEC_CHECKLIST)

export default function TenderSpecificationChecklistPage() {
  return <GuidePage guide={TENDER_SPEC_CHECKLIST} />
}
