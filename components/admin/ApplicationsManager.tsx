"use client"
import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, Copy, ArrowUp, ArrowDown, Save, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export interface ApplicationItem {
  id: string
  title: string
  description?: string
  icon?: string
  image?: string
  industry?: string
  priority: number
}

const INDUSTRIES = ['Agriculture', 'Municipal', 'Railways', 'Defence', 'Hospitals', 'Pest Control', 'Horticulture', 'Food Processing', 'Hotels & Hospitality', 'Other']

function genId() {
  return `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function parseToApplications(val: unknown): ApplicationItem[] {
  if (!val) return []
  const arr = Array.isArray(val) ? val : typeof val === 'string' ? val.split('\n').filter(Boolean) : []
  return arr.map((item: unknown, i: number) => {
    if (item && typeof item === 'object' && 'title' in item) {
      const a = item as ApplicationItem
      return { id: a.id || genId(), title: a.title || '', description: a.description || '', icon: a.icon || '', image: a.image || '', industry: a.industry || '', priority: a.priority ?? i }
    }
    const str = typeof item === 'string' ? item : String(item)
    return { id: genId(), title: str.trim(), description: '', icon: '', image: '', industry: '', priority: i }
  })
}

const EMPTY: Omit<ApplicationItem, 'id' | 'priority'> = { title: '', description: '', icon: '', image: '', industry: '' }

interface Props { value: unknown; onChange: (items: ApplicationItem[]) => void }

export function ApplicationsManager({ value, onChange }: Props) {
  const [items, setItems] = useState<ApplicationItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ ...EMPTY })
  const [isAdding, setIsAdding] = useState(false)
  const [addForm, setAddForm] = useState({ ...EMPTY })

  useEffect(() => { setItems(parseToApplications(value)) }, []) // eslint-disable-line

  const push = (next: ApplicationItem[]) => { setItems(next); onChange(next.map((it, i) => ({ ...it, priority: i }))) }

  const commitAdd = () => {
    if (!addForm.title.trim()) return
    push([...items, { ...addForm, id: genId(), priority: items.length }])
    setIsAdding(false)
  }

  const commitEdit = () => {
    if (!editingId) return
    push(items.map(it => it.id === editingId ? { ...it, ...editForm } : it))
    setEditingId(null)
  }

  const remove = (id: string) => push(items.filter(it => it.id !== id))

  const duplicate = (item: ApplicationItem) => {
    const idx = items.findIndex(it => it.id === item.id)
    const copy = { ...item, id: genId(), title: item.title + ' (copy)' }
    push([...items.slice(0, idx + 1), copy, ...items.slice(idx + 1)])
  }

  const move = (id: string, dir: 'up' | 'down') => {
    const idx = items.findIndex(it => it.id === id)
    if (idx === -1 || (dir === 'up' && idx === 0) || (dir === 'down' && idx === items.length - 1)) return
    const next = [...items]
    const swap = dir === 'up' ? idx - 1 : idx + 1
    ;[next[idx], next[swap]] = [next[swap], next[idx]]
    push(next)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">
          Applications
          <span className="ml-2 text-xs font-normal text-gray-400">({items.length} items)</span>
        </label>
        <Button type="button" variant="outline" size="sm" onClick={() => { setAddForm({ ...EMPTY }); setIsAdding(true) }} disabled={isAdding}>
          <Plus size={12} className="mr-1" />Add
        </Button>
      </div>

      {isAdding && (
        <div className="border border-green-200 rounded-lg bg-green-50 p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Input size={1} placeholder="Title (e.g. Municipal Vector Control)" value={addForm.title}
              onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} className="text-sm h-8" />
            <select value={addForm.industry} onChange={e => setAddForm(f => ({ ...f, industry: e.target.value }))}
              className="h-8 text-sm border border-gray-200 rounded px-2 bg-white">
              <option value="">Industry (optional)</option>
              {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          <Textarea value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Brief description (optional)" rows={2} className="text-sm resize-none" />
          <div className="grid grid-cols-2 gap-2">
            <Input size={1} value={addForm.icon} onChange={e => setAddForm(f => ({ ...f, icon: e.target.value }))} placeholder="Icon (emoji)" className="text-sm h-8" />
            <Input size={1} value={addForm.image} onChange={e => setAddForm(f => ({ ...f, image: e.target.value }))} placeholder="Image URL (optional)" className="text-sm h-8" />
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

      {items.length === 0 && !isAdding ? (
        <div className="text-center py-6 border border-dashed border-gray-200 rounded-lg bg-gray-50">
          <p className="text-xs text-gray-400">No applications yet.</p>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 overflow-hidden">
          {items.map((item, idx) => (
            <div key={item.id}>
              {editingId === item.id ? (
                <div className="p-3 bg-blue-50 border-l-2 border-blue-400 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input size={1} value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" className="text-sm h-8" />
                    <select value={editForm.industry} onChange={e => setEditForm(f => ({ ...f, industry: e.target.value }))}
                      className="h-8 text-sm border border-gray-200 rounded px-2 bg-white">
                      <option value="">Industry</option>
                      {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                    </select>
                  </div>
                  <Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Description" rows={2} className="text-sm resize-none" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input size={1} value={editForm.icon || ''} onChange={e => setEditForm(f => ({ ...f, icon: e.target.value }))} placeholder="Icon" className="text-sm h-8" />
                    <Input size={1} value={editForm.image || ''} onChange={e => setEditForm(f => ({ ...f, image: e.target.value }))} placeholder="Image URL" className="text-sm h-8" />
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
                    <button type="button" onClick={() => move(item.id, 'down')} disabled={idx === items.length - 1} className="text-gray-300 hover:text-gray-600 disabled:opacity-20"><ArrowDown size={10} /></button>
                  </div>
                  {item.icon && <span className="text-base flex-shrink-0 w-6 text-center">{item.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-800 truncate block">{item.title}</span>
                    {item.industry && <span className="text-[10px] text-gray-400">{item.industry}</span>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button type="button" onClick={() => { setEditingId(item.id); setEditForm({ title: item.title, description: item.description || '', icon: item.icon || '', image: item.image || '', industry: item.industry || '' }) }} className="p-1 text-gray-400 hover:text-blue-600"><Edit size={12} /></button>
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
