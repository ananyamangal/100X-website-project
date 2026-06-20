"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Save, RefreshCw } from "lucide-react"

interface KPIs {
  totalOrders: number
  statesServed: number
  departmentsServed: number
  unitsSupplied: number
  yearsExperience: number
}

const DEFAULTS: KPIs = {
  totalOrders: 500,
  statesServed: 15,
  departmentsServed: 80,
  unitsSupplied: 2000,
  yearsExperience: 12,
}

const FIELDS: { key: keyof KPIs; label: string; desc: string; suffix: string }[] = [
  { key: "totalOrders", label: "Total Government Orders", desc: "Number of government orders fulfilled", suffix: "+" },
  { key: "statesServed", label: "States Served", desc: "Number of Indian states with government supply", suffix: "+" },
  { key: "departmentsServed", label: "Departments Served", desc: "Unique government departments/bodies supplied", suffix: "+" },
  { key: "unitsSupplied", label: "Units Supplied", desc: "Total fogging machines supplied to government", suffix: "+" },
  { key: "yearsExperience", label: "Years of Experience", desc: "Years manufacturing fogging machines", suffix: "" },
]

export function GovKPIsTab() {
  const [kpis, setKpis] = useState<KPIs>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    fetch("/api/admin/gov-kpis")
      .then((r) => r.json())
      .then((data) => setKpis({ ...DEFAULTS, ...data }))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const save = async () => {
    setSaving(true)
    try {
      await fetch("/api/admin/gov-kpis", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(kpis),
      })
      setNotification("KPIs updated successfully")
      setTimeout(() => setNotification(null), 3000)
    } catch {
      setNotification("Error saving KPIs")
      setTimeout(() => setNotification(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  const F = (key: keyof KPIs, val: string) => setKpis((p) => ({ ...p, [key]: parseInt(val) || 0 }))

  return (
    <div>
      {notification && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-lg shadow-lg text-sm font-medium">
          {notification}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Government KPI Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">These numbers are displayed with animated counters on the website and OEM landing page</p>
        </div>
        <Button variant="outline" onClick={load} className="gap-2" disabled={loading}>
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {f.label}
                    {f.suffix && <span className="text-brand-600 ml-0.5">{f.suffix}</span>}
                  </label>
                  <p className="text-xs text-gray-400 mb-2">{f.desc}</p>
                  <Input
                    type="number"
                    min={0}
                    value={kpis[f.key]}
                    onChange={(e) => F(f.key, e.target.value)}
                    className="text-lg font-semibold"
                  />
                </div>
              ))}
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview — how it looks on website</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {FIELDS.map((f) => (
                  <div key={f.key} className="text-center">
                    <p className="text-2xl font-bold text-gray-900">
                      {kpis[f.key].toLocaleString("en-IN")}<span className="text-brand-600">{f.suffix}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{f.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={save} disabled={saving} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
              <Save size={14} />
              {saving ? "Saving…" : "Save KPIs"}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
        <strong>Tip:</strong> These KPIs are used on the OEM landing page, Past Performance page, and homepage trust snapshot. Update them regularly as you win more government orders.
      </div>
    </div>
  )
}
