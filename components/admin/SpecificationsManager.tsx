"use client"
import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, Copy, ArrowUp, ArrowDown, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface SpecItem {
  id: string
  label: string
  value: string
  group: string
  icon?: string
  order: number
}

const SPEC_GROUPS = ['Mechanical', 'Performance', 'Electrical', 'Compliance', 'Physical', 'Other']

function genId() {
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function detectGroup(label: string): string {
  const l = label.toLowerCase()
  if (l.match(/engine|fuel|stroke|rpm|ignition|cylinder/)) return 'Mechanical'
  if (l.match(/tank|capacity|reservoir|weight|dimension|size|length|width|height/)) return 'Physical'
  if (l.match(/output|flow|coverage|spray|fog|range|pressure|speed|performance/)) return 'Performance'
  if (l.match(/volt|amp|electric|power|watt|battery/)) return 'Electrical'
  if (l.match(/certif|approved|standard|comply|bis|ce|iso|safety/)) return 'Compliance'
  return 'Other'
}

function parseToSpecs(val: unknown): SpecItem[] {
  if (!val) return []
  const arr = Array.isArray(val) ? val : typeof val === 'string' ? val.split('\n').filter(Boolean) : []
  return arr.map((item: unknown, i: number) => {
    if (item && typeof item === 'object' && 'label' in item) {
      const s = item as SpecItem
      return { id: s.id || genId(), label: s.label || '', value: s.value || '', group: s.group || 'Other', icon: s.icon || '', order: s.order ?? i }
    }
    const str = typeof item === 'string' ? item : String(item)
    const colonIdx = str.indexOf(':')
    const label = colonIdx > -1 ? str.slice(0, colonIdx).trim() : str.trim()
    const value = colonIdx > -1 ? str.slice(colonIdx + 1).trim() : ''
    return { id: genId(), label, value, group: detectGroup(label), icon: '', order: i }
  })
}

const EMPTY: Omit<SpecItem, 'id' | 'order'> = { label: '', value: '', group: 'Other', icon: '' }

interface Props { value: unknown; onChange: (items: SpecItem[]) => void }

export function SpecificationsManager({ value, onChange }: Props) {
  const [items, setItems] = useState<SpecItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ ...EMPTY })
  const [isAdding, setIsAdding] = useState(false)
  const [addForm, setAddForm] = useState({ ...EMPTY })
  const [filterGroup, setFilterGroup] = useState('All')

  useEffect(() => { setItems(parseToSpecs(value)) }, []) // eslint-disable-line

  const push = (next: SpecItem[]) => { setItems(next); onChange(next.map((it, i) => ({ ...it, order: i }))) }

  const commitAdd = () => {
    if (!addForm.label.trim()) return
    push([...items, { ...addForm, id: genId(), order: items.length }])
    setIsAdding(false)
  }

  const commitEdit = () => {
    if (!editingId) return
    push(items.map(it => it.id === editingId ? { ...it, ...editForm } : it))
    setEditingId(null)
  }

  const remove = (id: string) => push(items.filter(it => it.id !== id))

  const duplicate = (item: SpecItem) => {
    const idx = items.findIndex(it => it.id === item.id)
    const copy = { ...item, id: genId(), label: item.label + ' (copy)' }
    const next = [...items.slice(0, idx + 1), copy, ...items.slice(idx + 1)]
    push(next)
  }

  const move = (id: string, dir: 'up' | 'down') => {
    const visible = filterGroup === 'All' ? items : items.filter(it => it.group === filterGroup)
    const idx = visible.findIndex(it => it.id === id)
    if (idx === -1 || (dir === 'up' && idx === 0) || (dir === 'down' && idx === visible.length - 1)) return
    const globalIdx = items.findIndex(it => it.id === id)
    const swapId = dir === 'up' ? visible[idx - 1].id : visible[idx + 1].id
    const globalSwap = items.findIndex(it => it.id === swapId)
    const next = [...items]
    ;[next[globalIdx], next[globalSwap]] = [next[globalSwap], next[globalIdx]]
    push(next)
  }

  const visibleItems = filterGroup === 'All' ? items : items.filter(it => it.group === filterGroup)
  const groupCounts = SPEC_GROUPS.reduce<Record<string, number>>((acc, g) => {
    acc[g] = items.filter(it => it.group === g).length
    return acc
  }, {})

  const GROUP_COLORS: Record<string, string> = {
    Mechanical: 'bg-orange-100 text-orange-700',
    Performance: 'bg-blue-100 text-blue-700',
    Electrical: 'bg-yellow-100 text-yellow-700',
    Compliance: 'bg-green-100 text-green-700',
    Physical: 'bg-purple-100 text-purple-700',
    Other: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">
          Specifications
          <span className="ml-2 text-xs font-normal text-gray-400">({items.length} items)</span>
        </label>
        <Button type="button" variant="outline" size="sm" onClick={() => { setAddForm({ ...EMPTY }); setIsAdding(true) }} disabled={isAdding}>
          <Plus size={12} className="mr-1" />Add
        </Button>
      </div>

      {/* Group filter tabs */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {['All', ...SPEC_GROUPS].map(g => (
            <button key={g} type="button"
              onClick={() => setFilterGroup(g)}
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                filterGroup === g ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {g}{g !== 'All' && groupCounts[g] > 0 && <span className="ml-1 opacity-70">({groupCounts[g]})</span>}
            </button>
          ))}
        </div>
      )}

      {/* Add row */}
      {isAdding && (
        <div className="border border-green-200 rounded-lg bg-green-50 p-3 space-y-2">
          <div className="grid grid-cols-3 gap-2">
            <Input size={1} placeholder="Label (e.g. Engine Type)" value={addForm.label}
              onChange={e => setAddForm(f => ({ ...f, label: e.target.value, group: detectGroup(e.target.value) }))}
              className="text-sm h-8" />
            <Input size={1} placeholder="Value (e.g. 2-stroke)" value={addForm.value}
              onChange={e => setAddForm(f => ({ ...f, value: e.target.value }))} className="text-sm h-8" />
            <select value={addForm.group} onChange={e => setAddForm(f => ({ ...f, group: e.target.value }))}
              className="h-8 text-sm border border-gray-200 rounded px-2">
              {SPEC_GROUPS.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={commitAdd} className="bg-green-600 hover:bg-green-700 h-7 text-xs">
              <Save size={11} className="mr-1" />Add
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAdding(false)} className="h-7 text-xs">
              <X size={11} className="mr-1" />Cancel
            </Button>
          </div>
        </div>
      )}

      {visibleItems.length === 0 && !isAdding ? (
        <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg bg-gray-50">
          <p className="text-xs text-gray-400">No specifications yet.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
          {visibleItems.map((item, idx) => (
            <div key={item.id}>
              {editingId === item.id ? (
                <div className="p-3 bg-blue-50 border-l-2 border-blue-400 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <Input size={1} value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} placeholder="Label" className="text-sm h-8" />
                    <Input size={1} value={editForm.value} onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))} placeholder="Value" className="text-sm h-8" />
                    <select value={editForm.group} onChange={e => setEditForm(f => ({ ...f, group: e.target.value }))}
                      className="h-8 text-sm border border-gray-200 rounded px-2">
                      {SPEC_GROUPS.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" onClick={commitEdit} className="bg-blue-600 hover:bg-blue-700 h-7 text-xs">
                      <Save size={11} className="mr-1" />Save
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditingId(null)} className="h-7 text-xs">
                      <X size={11} className="mr-1" />Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-white hover:bg-gray-50">
                  <div className="flex flex-col gap-px flex-shrink-0">
                    <button type="button" onClick={() => move(item.id, 'up')} disabled={idx === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20"><ArrowUp size={10} /></button>
                    <button type="button" onClick={() => move(item.id, 'down')} disabled={idx === visibleItems.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20"><ArrowDown size={10} /></button>
                  </div>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${GROUP_COLORS[item.group] || 'bg-gray-100 text-gray-600'}`}>{item.group}</span>
                  <div className="flex-1 min-w-0 flex items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-600 truncate w-32 flex-shrink-0">{item.label}</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-sm text-gray-800 truncate">{item.value}</span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button type="button" onClick={() => { setEditingId(item.id); setEditForm({ label: item.label, value: item.value, group: item.group, icon: item.icon || '' }) }} className="p-1 text-gray-400 hover:text-blue-600"><Edit size={12} /></button>
                    <button type="button" onClick={() => duplicate(item)} className="p-1 text-gray-400 hover:text-green-600"><Copy size={12} /></button>
                    <button type="button" onClick={() => remove(item.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={12} /></button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
