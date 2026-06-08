"use client"
import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, Copy, ArrowUp, ArrowDown, Save, X, Info, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface FeatureItem {
  id: string
  title: string
  value: string
  icon?: string
  image?: string
  tooltip?: string
  order: number
}

function genId() {
  return `f-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function parseToFeatures(val: unknown): FeatureItem[] {
  if (!val) return []
  const arr = Array.isArray(val) ? val : typeof val === 'string' ? val.split('\n').filter(Boolean) : []
  return arr.map((item: unknown, i: number) => {
    if (item && typeof item === 'object' && 'title' in item) {
      const f = item as FeatureItem
      return { id: f.id || genId(), title: f.title || '', value: f.value || '', icon: f.icon || '', image: f.image || '', tooltip: f.tooltip || '', order: f.order ?? i }
    }
    const str = typeof item === 'string' ? item : String(item)
    const colonIdx = str.indexOf(':')
    return {
      id: genId(),
      title: colonIdx > -1 ? str.slice(0, colonIdx).trim() : str.trim(),
      value: colonIdx > -1 ? str.slice(colonIdx + 1).trim() : '',
      icon: '', image: '', tooltip: '',
      order: i,
    }
  })
}

const EMPTY_FEATURE: Omit<FeatureItem, 'id' | 'order'> = {
  title: '', value: '', icon: '', image: '', tooltip: '',
}

interface Props {
  value: unknown
  onChange: (items: FeatureItem[]) => void
}

export function FeaturesManager({ value, onChange }: Props) {
  const [items, setItems] = useState<FeatureItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ ...EMPTY_FEATURE })
  const [isAdding, setIsAdding] = useState(false)
  const [addForm, setAddForm] = useState({ ...EMPTY_FEATURE })

  useEffect(() => {
    setItems(parseToFeatures(value))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const push = (next: FeatureItem[]) => {
    setItems(next)
    onChange(next.map((it, i) => ({ ...it, order: i })))
  }

  const startAdd = () => { setAddForm({ ...EMPTY_FEATURE }); setIsAdding(true) }
  const cancelAdd = () => setIsAdding(false)

  const commitAdd = () => {
    if (!addForm.title.trim()) return
    const next = [...items, { ...addForm, id: genId(), order: items.length }]
    push(next)
    setIsAdding(false)
  }

  const startEdit = (item: FeatureItem) => {
    setEditingId(item.id)
    setEditForm({ title: item.title, value: item.value, icon: item.icon || '', image: item.image || '', tooltip: item.tooltip || '' })
  }

  const commitEdit = () => {
    if (!editingId) return
    const next = items.map(it => it.id === editingId ? { ...it, ...editForm } : it)
    push(next)
    setEditingId(null)
  }

  const remove = (id: string) => push(items.filter(it => it.id !== id))

  const duplicate = (item: FeatureItem) => {
    const idx = items.findIndex(it => it.id === item.id)
    const copy = { ...item, id: genId(), title: item.title + ' (copy)' }
    const next = [...items.slice(0, idx + 1), copy, ...items.slice(idx + 1)]
    push(next)
  }

  const move = (id: string, dir: 'up' | 'down') => {
    const idx = items.findIndex(it => it.id === id)
    if (idx === -1) return
    if (dir === 'up' && idx === 0) return
    if (dir === 'down' && idx === items.length - 1) return
    const next = [...items]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    push(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">
          Features
          <span className="ml-2 text-xs font-normal text-gray-400">({items.length} items)</span>
        </label>
        <Button type="button" variant="outline" size="sm" onClick={startAdd} disabled={isAdding}>
          <Plus size={12} className="mr-1" />Add
        </Button>
      </div>

      {/* Add row */}
      {isAdding && (
        <div className="border border-green-200 rounded-lg bg-green-50 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input size={1} placeholder="Title (e.g. Tank Capacity)" value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} className="text-sm h-8" />
            <Input size={1} placeholder="Value (e.g. 50 Litres)" value={addForm.value} onChange={e => setAddForm(f => ({ ...f, value: e.target.value }))} className="text-sm h-8" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Input size={1} placeholder="Icon (emoji or name)" value={addForm.icon} onChange={e => setAddForm(f => ({ ...f, icon: e.target.value }))} className="text-sm h-8" />
            <Input size={1} placeholder="Tooltip text" value={addForm.tooltip} onChange={e => setAddForm(f => ({ ...f, tooltip: e.target.value }))} className="text-sm h-8" />
            <Input size={1} placeholder="Image URL (optional)" value={addForm.image} onChange={e => setAddForm(f => ({ ...f, image: e.target.value }))} className="text-sm h-8" />
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={commitAdd} className="bg-green-600 hover:bg-green-700 h-7 text-xs">
              <Save size={11} className="mr-1" />Add
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={cancelAdd} className="h-7 text-xs">
              <X size={11} className="mr-1" />Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Items list */}
      {items.length === 0 && !isAdding ? (
        <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg bg-gray-50">
          <p className="text-xs text-gray-400">No features yet. Click Add to create your first feature.</p>
        </div>
      ) : (
        <div className="space-y-1 border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
          {items.map((item, idx) => (
            <div key={item.id}>
              {editingId === item.id ? (
                <div className="p-3 bg-blue-50 border-l-2 border-blue-400 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input size={1} value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" className="text-sm h-8" />
                    <Input size={1} value={editForm.value} onChange={e => setEditForm(f => ({ ...f, value: e.target.value }))} placeholder="Value" className="text-sm h-8" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Input size={1} value={editForm.icon} onChange={e => setEditForm(f => ({ ...f, icon: e.target.value }))} placeholder="Icon" className="text-sm h-8" />
                    <Input size={1} value={editForm.tooltip || ''} onChange={e => setEditForm(f => ({ ...f, tooltip: e.target.value }))} placeholder="Tooltip" className="text-sm h-8" />
                    <Input size={1} value={editForm.image} onChange={e => setEditForm(f => ({ ...f, image: e.target.value }))} placeholder="Image URL" className="text-sm h-8" />
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
                  {/* Order */}
                  <div className="flex flex-col gap-px flex-shrink-0">
                    <button type="button" onClick={() => move(item.id, 'up')} disabled={idx === 0} className="text-gray-300 hover:text-gray-600 disabled:opacity-20"><ArrowUp size={10} /></button>
                    <button type="button" onClick={() => move(item.id, 'down')} disabled={idx === items.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20"><ArrowDown size={10} /></button>
                  </div>
                  {/* Icon */}
                  {item.icon && <span className="text-base flex-shrink-0 w-6 text-center">{item.icon}</span>}
                  {/* Content */}
                  <div className="flex-1 min-w-0 flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800 truncate">{item.title}</span>
                    {item.value && <span className="text-xs text-gray-400 truncate">{item.value}</span>}
                    {item.tooltip && <Info size={11} className="text-gray-300 flex-shrink-0" title={item.tooltip} />}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button type="button" onClick={() => startEdit(item)} className="p-1 text-gray-400 hover:text-blue-600"><Edit size={12} /></button>
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
