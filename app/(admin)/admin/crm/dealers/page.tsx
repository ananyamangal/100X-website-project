import { DealerImport } from "@/components/admin/crm/DealerImport"
import { DealerDirectory } from "@/components/admin/crm/DealerDirectory"

export default function DealersPage() {
  return (
    <div className="space-y-8">
      <DealerImport />
      <DealerDirectory />
    </div>
  )
}
