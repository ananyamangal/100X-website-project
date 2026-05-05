"use client"

import dynamic from "next/dynamic"
import { useMemo } from "react"
import { cn } from "@/lib/utils"
import "react-quill-new/dist/quill.snow.css"

const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="min-h-[220px] rounded-md border border-input bg-muted/40 animate-pulse" aria-hidden />
  ),
})

type AdminRichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function AdminRichTextEditor({ value, onChange, placeholder, className }: AdminRichTextEditorProps) {
  const modules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, 3, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ size: ["small", false, "large", "huge"] }],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link"],
        ["clean"],
      ],
    }),
    []
  )

  const formats = useMemo(
    () => ["header", "bold", "italic", "underline", "strike", "list", "bullet", "size", "link"],
    []
  )

  return (
    <div
      className={cn(
        "admin-rich-text rounded-md border border-input bg-background overflow-hidden",
        "[&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-input [&_.ql-toolbar]:rounded-t-md",
        "[&_.ql-container]:border-0 [&_.ql-container]:rounded-b-md [&_.ql-editor]:min-h-[200px] [&_.ql-editor]:text-base",
        className
      )}
    >
      <ReactQuill
        theme="snow"
        value={value ?? ""}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  )
}
