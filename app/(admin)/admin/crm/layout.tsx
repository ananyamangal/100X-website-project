import type { ReactNode } from "react"
import { CrmShell } from "@/components/admin/crm/CrmShell"

export default function CrmLayout({ children }: { children: ReactNode }) {
  return <CrmShell>{children}</CrmShell>
}
