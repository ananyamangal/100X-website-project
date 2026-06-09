"use client"

import React, { useRef, useState } from "react"
import { Upload, X, ImageIcon, Loader2, FolderOpen } from "lucide-react"
import { uploadToCloudinary } from "@/lib/cloudinaryUpload"
import { MediaLibraryModal } from "./MediaLibraryModal"

/* ── Single image upload ────────────────────────────────── */

interface ImageUploadFieldProps {
  label?: string
  value: string
  onChange: (url: string) => void
  standards?: string
  preset?: string
}

export function ImageUploadField({ label, value, onChange, standards, preset }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [libOpen, setLibOpen] = useState(false)

  const upload = async (file: File) => {
    setUploading(true)
    try {
      const url = await uploadToCloudinary(file, "image", preset)
      onChange(url)
    } catch {}
    finally { setUploading(false) }
  }

  const handleFiles = (files: FileList | null) => {
    if (files?.[0]) upload(files[0])
  }

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-gray-700">{label}</label>}

      {/* Preview + drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
        className={`relative flex items-center justify-center rounded-lg border-2 border-dashed transition-colors min-h-[80px] ${
          dragOver
            ? "border-green-400 bg-green-50"
            : value
            ? "border-gray-200 bg-gray-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 cursor-pointer"
        }`}
        onClick={() => !value && inputRef.current?.click()}
      >
        {value ? (
          <img src={value} alt="Preview" className="max-h-40 max-w-full rounded object-contain p-1" />
        ) : (
          <div className="text-center py-5 px-3 pointer-events-none">
            <ImageIcon size={20} className="text-gray-300 mx-auto mb-1" />
            <p className="text-xs text-gray-400">Drop image here or click Upload</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 rounded-lg flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-green-600" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFiles(e.target.files)} />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
          {uploading ? "Uploading…" : "Upload"}
        </button>
        <button
          type="button"
          onClick={() => setLibOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
        >
          <FolderOpen size={11} />
          Library
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-xs text-red-500 hover:text-red-600"
          >
            <X size={11} /> Remove
          </button>
        )}
      </div>

      {standards && <p className="text-[11px] text-gray-400">{standards}</p>}

      <MediaLibraryModal open={libOpen} onClose={() => setLibOpen(false)} onSelect={url => { onChange(url); setLibOpen(false) }} />
    </div>
  )
}

/* ── Multi image upload ─────────────────────────────────── */

interface ImageUploadMultiFieldProps {
  label?: string
  value: string[]
  onChange: (urls: string[]) => void
  max?: number
  standards?: string
  preset?: string
}

export function ImageUploadMultiField({ label, value, onChange, max = 10, standards, preset }: ImageUploadMultiFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [libOpen, setLibOpen] = useState(false)

  const uploadFiles = async (files: File[]) => {
    if (value.length >= max) return
    const toUpload = files.slice(0, max - value.length)
    setUploading(true)
    const urls: string[] = []
    for (const file of toUpload) {
      try {
        const url = await uploadToCloudinary(file, "image", preset)
        urls.push(url)
      } catch {}
    }
    onChange([...value, ...urls])
    setUploading(false)
  }

  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx))

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return
    uploadFiles(Array.from(files))
  }

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">{label}</label>
          <span className="text-xs text-gray-400">{value.length}/{max}</span>
        </div>
      )}

      {/* Existing images grid */}
      {value.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {value.map((url, i) => (
            <div key={i} className="relative group">
              <img src={url} alt={`Image ${i + 1}`} className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute top-0.5 right-0.5 bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone (only if under max) */}
      {value.length < max && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          className={`flex items-center justify-center rounded-lg border-2 border-dashed transition-colors min-h-[60px] cursor-pointer ${
            dragOver ? "border-green-400 bg-green-50" : "border-gray-300 bg-gray-50 hover:border-gray-400"
          }`}
        >
          {uploading ? (
            <div className="flex items-center gap-2 py-3">
              <Loader2 size={14} className="animate-spin text-green-600" />
              <span className="text-xs text-gray-500">Uploading…</span>
            </div>
          ) : (
            <div className="text-center py-3 px-3 pointer-events-none">
              <Upload size={15} className="text-gray-300 mx-auto mb-1" />
              <p className="text-xs text-gray-400">Drop images or click to upload</p>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
        <button
          type="button"
          disabled={uploading || value.length >= max}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
          {uploading ? "Uploading…" : "Upload Images"}
        </button>
        <button
          type="button"
          disabled={value.length >= max}
          onClick={() => setLibOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <FolderOpen size={11} />
          Library
        </button>
      </div>

      {standards && <p className="text-[11px] text-gray-400">{standards}</p>}

      <MediaLibraryModal
        open={libOpen}
        onClose={() => setLibOpen(false)}
        onSelect={url => {
          if (value.length < max) onChange([...value, url])
          setLibOpen(false)
        }}
      />
    </div>
  )
}
