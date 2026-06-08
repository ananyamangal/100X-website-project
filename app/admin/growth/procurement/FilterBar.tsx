"use client"
import { useState } from "react"
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react"

export interface ProcFilter {
  dateFrom:  string
  dateTo:    string
  seller:    string
  dept:      string
  product:   string
  state:     string
  ministry:  string
  valueMin:  string
  valueMax:  string
  msme:      boolean
  status:    string
}

export const EMPTY_FILTER: ProcFilter = {
  dateFrom: "", dateTo: "", seller: "", dept: "",
  product: "", state: "", ministry: "", valueMin: "", valueMax: "",
  msme: false, status: "",
}

function activeCount(f: ProcFilter): number {
  return [
    f.dateFrom, f.dateTo, f.seller, f.dept, f.product,
    f.state, f.ministry, f.valueMin, f.valueMax, f.status,
  ].filter(Boolean).length + (f.msme ? 1 : 0)
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">{label}</label>
      {children}
    </div>
  )
}

const INPUT_CLS = "w-full text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100"

interface Props {
  filter: ProcFilter
  onChange: (f: ProcFilter) => void
}

export function FilterBar({ filter, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const count = activeCount(filter)

  const set = (k: keyof ProcFilter, v: string | boolean) =>
    onChange({ ...filter, [k]: v })

  const clear = () => onChange(EMPTY_FILTER)

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {/* Collapsed header */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={13} className={count > 0 ? "text-brand-600" : "text-gray-400"} />
          <span className="text-xs font-medium text-gray-700">
            Filter / Scope
          </span>
          {count > 0 && (
            <span className="text-[10px] font-bold bg-brand-600 text-white rounded-full px-1.5 py-0.5">
              {count}
            </span>
          )}
          {count > 0 && (
            <span className="text-[10px] text-gray-400 ml-1">
              {[
                filter.dateFrom && `from ${filter.dateFrom}`,
                filter.dateTo   && `to ${filter.dateTo}`,
                filter.seller   && `seller: ${filter.seller.slice(0, 20)}`,
                filter.dept     && `dept: ${filter.dept.slice(0, 20)}`,
                filter.product  && `product: ${filter.product.slice(0, 20)}`,
                filter.state    && filter.state,
                filter.ministry && filter.ministry,
                filter.msme     && "MSME only",
              ].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <button
              onClick={e => { e.stopPropagation(); clear() }}
              className="text-[10px] text-red-500 hover:text-red-700 flex items-center gap-0.5">
              <X size={10} />Clear
            </button>
          )}
          {open ? <ChevronUp size={13} className="text-gray-400" /> : <ChevronDown size={13} className="text-gray-400" />}
        </div>
      </button>

      {/* Expanded filters */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Field label="Date From">
              <input type="date" value={filter.dateFrom} onChange={e => set("dateFrom", e.target.value)}
                className={INPUT_CLS} />
            </Field>
            <Field label="Date To">
              <input type="date" value={filter.dateTo} onChange={e => set("dateTo", e.target.value)}
                className={INPUT_CLS} />
            </Field>
            <Field label="Seller">
              <input placeholder="Search seller…" value={filter.seller}
                onChange={e => set("seller", e.target.value)} className={INPUT_CLS} />
            </Field>
            <Field label="Department">
              <input placeholder="Search dept…" value={filter.dept}
                onChange={e => set("dept", e.target.value)} className={INPUT_CLS} />
            </Field>
            <Field label="Product">
              <input placeholder="Search product…" value={filter.product}
                onChange={e => set("product", e.target.value)} className={INPUT_CLS} />
            </Field>
            <Field label="State">
              <input placeholder="State…" value={filter.state}
                onChange={e => set("state", e.target.value)} className={INPUT_CLS} />
            </Field>
            <Field label="Ministry">
              <input placeholder="Ministry…" value={filter.ministry}
                onChange={e => set("ministry", e.target.value)} className={INPUT_CLS} />
            </Field>
            <Field label="Value Min (₹)">
              <input type="number" placeholder="0" value={filter.valueMin}
                onChange={e => set("valueMin", e.target.value)} className={INPUT_CLS} />
            </Field>
            <Field label="Value Max (₹)">
              <input type="number" placeholder="any" value={filter.valueMax}
                onChange={e => set("valueMax", e.target.value)} className={INPUT_CLS} />
            </Field>
            <Field label="Status">
              <select value={filter.status} onChange={e => set("status", e.target.value)} className={INPUT_CLS}>
                <option value="">Any</option>
                <option value="Contract Generated">Contract Generated</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </Field>
            <Field label="MSME Only">
              <label className="flex items-center gap-2 pt-1.5 cursor-pointer">
                <input type="checkbox" checked={filter.msme}
                  onChange={e => set("msme", e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-brand-600" />
                <span className="text-xs text-gray-700">MSME sellers</span>
              </label>
            </Field>
          </div>

          <div className="mt-3 flex justify-end">
            <button onClick={clear}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors">
              Clear all filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
