"use client"
import { useState } from "react"
import { Building2, TrendingUp } from "lucide-react"
import { BuyersTab }  from "./BuyersTab"
import { TargetsTab } from "./TargetsTab"

export function BuyerIntelTab({ onDealerClick }: { onDealerClick: (name: string) => void }) {
  const [view, setView] = useState<"buyers" | "targets">("targets")

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 rounded-xl p-1.5 flex gap-1 w-fit shadow-sm">
        <button onClick={() => setView("targets")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            view === "targets" ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}>
          <TrendingUp size={11} />Dealer Targets
        </button>
        <button onClick={() => setView("buyers")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            view === "buyers" ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}>
          <Building2 size={11} />Buyer Segments
        </button>
      </div>

      {view === "targets" && <TargetsTab onDealerClick={onDealerClick} />}
      {view === "buyers"  && <BuyersTab  onDealerClick={onDealerClick} />}
    </div>
  )
}
