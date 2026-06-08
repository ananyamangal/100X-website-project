"use client"
import { useState } from "react"
import { Layers, PlusCircle, HardDrive } from "lucide-react"
import { BatchTab }   from "./BatchTab"
import { CollectTab } from "./CollectTab"
import { StorageTab } from "./StorageTab"

export function CollectDataTab({ onSaved }: { onSaved: () => void }) {
  const [view, setView] = useState<"batch" | "single" | "storage">("batch")

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 rounded-xl p-1.5 flex gap-1 w-fit shadow-sm">
        <button onClick={() => setView("batch")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            view === "batch" ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}>
          <Layers size={11} />Batch Collect
        </button>
        <button onClick={() => setView("single")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            view === "single" ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}>
          <PlusCircle size={11} />Single Bid
        </button>
        <button onClick={() => setView("storage")}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
            view === "storage" ? "bg-brand-600 text-white" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}>
          <HardDrive size={11} />PDF Storage
        </button>
      </div>

      {view === "batch"   && <BatchTab   onSaved={onSaved} />}
      {view === "single"  && <CollectTab onSaved={onSaved} />}
      {view === "storage" && <StorageTab />}
    </div>
  )
}
