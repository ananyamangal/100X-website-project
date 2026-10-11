"use client"
import type { ReactNode } from "react"

type Tone = "gray" | "blue" | "green" | "amber" | "red" | "violet"

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
    violet: "bg-violet-100 text-violet-800",
  }
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${tones[tone]}`}>{children}</span>
}

export const DealerBadge = () => <Badge tone="violet">Existing dealer</Badge>

export function stageTone(stage: string): Tone {
  if (stage === "closed_won" || stage === "payment_received" || stage === "dispatched") return "green"
  if (stage === "closed_lost") return "red"
  if (stage === "new" || stage === "repeat_enquiry") return "blue"
  if (stage === "negotiation" || stage === "po_received" || stage === "invoice_raised") return "amber"
  return "gray"
}

export function Chip({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-[44px] rounded-full border px-4 text-sm font-medium transition-colors ${
        selected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  )
}

export function Spinner({ label = "Loading..." }: { label?: string }) {
  return <div className="p-6 text-center text-sm text-gray-500" role="status">{label}</div>
}

export function ErrorBox({ children, onRetry }: { children: ReactNode; onRetry?: () => void }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
      <div>{children}</div>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 min-h-[40px] rounded-md border border-red-300 bg-white px-3 font-medium">
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyBox({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">{children}</div>
}

export const inputCls =
  "w-full min-h-[48px] rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200"
export const btnPrimary =
  "inline-flex min-h-[48px] items-center justify-center rounded-lg bg-blue-600 px-5 text-base font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
export const btnSecondary =
  "inline-flex min-h-[44px] items-center justify-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
