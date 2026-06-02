'use client'
import React, { useState } from 'react'
import { Zap, Settings, Gauge, Box, Battery, ChevronDown } from 'lucide-react'
import ScrollReveal from '@/components/cinematic/ScrollReveal'

interface SpecRow { key: string; value: string }
interface SpecGroup { category: string; rows: SpecRow[]; icon: React.ReactNode }

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  engine:      <Zap size={15} />,
  performance: <Gauge size={15} />,
  capacity:    <Box size={15} />,
  dimensions:  <Box size={15} />,
  power:       <Battery size={15} />,
  fuel:        <Zap size={15} />,
  output:      <Gauge size={15} />,
  tank:        <Box size={15} />,
  weight:      <Box size={15} />,
  default:     <Settings size={15} />,
}

function getIcon(cat: string): React.ReactNode {
  const key = cat.toLowerCase()
  for (const [k, icon] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return icon
  }
  return CATEGORY_ICONS.default
}

function parseSpecs(specs: string[]): SpecGroup[] {
  // Supports two formats:
  // 1. "Category | Key: Value"  — grouped
  // 2. "Key: Value"             — ungrouped (put in 'General')
  const groups: Record<string, SpecRow[]> = {}

  for (const spec of specs) {
    if (!spec.trim()) continue
    if (spec.includes('|')) {
      const [cat, rest] = spec.split('|').map(s => s.trim())
      const colonIdx = rest.indexOf(':')
      if (colonIdx === -1) continue
      const key = rest.slice(0, colonIdx).trim()
      const value = rest.slice(colonIdx + 1).trim()
      if (!groups[cat]) groups[cat] = []
      groups[cat].push({ key, value })
    } else {
      const colonIdx = spec.indexOf(':')
      if (colonIdx === -1) continue
      const key = spec.slice(0, colonIdx).trim()
      const value = spec.slice(colonIdx + 1).trim()
      if (!groups['General']) groups['General'] = []
      groups['General'].push({ key, value })
    }
  }

  return Object.entries(groups).map(([category, rows]) => ({
    category,
    rows,
    icon: getIcon(category),
  }))
}

function SpecCard({ group }: { group: SpecGroup }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Category header */}
      <div className="flex items-center gap-2.5 px-5 py-3.5 bg-gray-50 border-b border-gray-100">
        <span className="w-6 h-6 rounded-md bg-brand-100 flex items-center justify-center text-brand-700">
          {group.icon}
        </span>
        <h3 className="font-700 text-gray-800 text-sm uppercase tracking-wide">{group.category}</h3>
      </div>
      {/* Rows */}
      <div className="divide-y divide-gray-50">
        {group.rows.map((row, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3 gap-4 hover:bg-gray-50/50 transition-colors">
            <span className="text-gray-500 text-sm">{row.key}</span>
            <span className="text-gray-900 font-600 text-sm text-right">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Mobile accordion for a spec group
function SpecAccordion({ group }: { group: SpecGroup }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded flex items-center justify-center text-brand-600">
            {group.icon}
          </span>
          <span className="font-700 text-gray-800 text-sm uppercase tracking-wide">{group.category}</span>
          <span className="text-[10px] text-gray-400 font-500">({group.rows.length})</span>
        </div>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-gray-50 divide-y divide-gray-50">
          {group.rows.map((row, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-3">
              <span className="text-gray-500 text-xs">{row.key}</span>
              <span className="text-gray-900 font-600 text-xs text-right">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SpecificationsTable({ specs }: { specs: string[] }) {
  if (!specs?.length) return null
  const groups = parseSpecs(specs)
  if (!groups.length) return null

  return (
    <section className="py-16 md:py-20 bg-gray-50" id="specs">
      <div className="container mx-auto px-4 md:px-6">
        <ScrollReveal animation="fade-up" className="mb-10">
          <p className="eyebrow text-brand-600 mb-3">Technical Data</p>
          <h2 className="text-display-xs text-gray-900">Specifications.</h2>
        </ScrollReveal>

        {/* Desktop: card grid */}
        <ScrollReveal animation="fade-up" delay={100}>
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {groups.map(g => <SpecCard key={g.category} group={g} />)}
          </div>

          {/* Mobile: accordion */}
          <div className="md:hidden space-y-2">
            {groups.map(g => <SpecAccordion key={g.category} group={g} />)}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
