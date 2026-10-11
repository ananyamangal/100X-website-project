import { LeadDetail } from "@/components/admin/crm/LeadDetail"

export default async function LeadDetailPage({ params }: { params: Promise<{ contactId: string }> }) {
  const { contactId } = await params
  return <LeadDetail contactId={contactId} />
}
