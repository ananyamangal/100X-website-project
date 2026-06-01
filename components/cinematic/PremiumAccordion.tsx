'use client'
import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface AccordionItem {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: string
  children: React.ReactNode
}

interface PremiumAccordionProps {
  items: AccordionItem[]
  defaultOpen?: string
  variant?: 'light' | 'dark'
  className?: string
  allowMultiple?: boolean
}

function AccordionRow({
  item,
  isOpen,
  onToggle,
  variant,
}: {
  item: AccordionItem
  isOpen: boolean
  onToggle: () => void
  variant: 'light' | 'dark'
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | 'auto'>(0)

  useEffect(() => {
    if (!contentRef.current) return
    if (isOpen) {
      setHeight(contentRef.current.scrollHeight)
      const timer = setTimeout(() => setHeight('auto'), 350)
      return () => clearTimeout(timer)
    } else {
      setHeight(contentRef.current.scrollHeight)
      requestAnimationFrame(() => requestAnimationFrame(() => setHeight(0)))
    }
  }, [isOpen])

  const isDark = variant === 'dark'

  return (
    <div className={cn(
      'border-b last:border-b-0 transition-colors',
      isDark ? 'border-white/8' : 'border-gray-100',
    )}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          'w-full flex items-center justify-between px-6 py-5 text-left transition-colors group',
          isDark
            ? isOpen ? 'bg-white/5' : 'hover:bg-white/3'
            : isOpen ? 'bg-brand-50/60' : 'hover:bg-gray-50',
        )}
      >
        <div className="flex items-center gap-3">
          {item.icon && (
            <span className={cn(
              'w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors',
              isDark
                ? isOpen ? 'bg-brand-600 text-white' : 'bg-white/8 text-cinema-400'
                : isOpen ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500',
            )}>
              {item.icon}
            </span>
          )}
          <span className={cn(
            'font-600 text-sm transition-colors',
            isDark
              ? isOpen ? 'text-white' : 'text-cinema-200'
              : isOpen ? 'text-brand-700' : 'text-gray-800',
          )}>
            {item.label}
          </span>
          {item.badge && (
            <span className={cn(
              'text-[10px] font-600 px-2 py-0.5 rounded-full uppercase tracking-wide',
              isDark ? 'bg-brand-600/20 text-brand-400' : 'bg-brand-100 text-brand-700',
            )}>
              {item.badge}
            </span>
          )}
        </div>
        <span className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300',
          isDark ? 'border border-white/15 text-cinema-400' : 'border border-gray-200 text-gray-400',
          isOpen ? 'rotate-45' : '',
        )}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="6" y1="2" x2="6" y2="10" />
            <line x1="2" y1="6" x2="10" y2="6" />
          </svg>
        </span>
      </button>

      {/* Animated panel */}
      <div
        style={{ height: height === 'auto' ? 'auto' : height, overflow: 'hidden', transition: 'height 0.35s cubic-bezier(0.16,1,0.3,1)' }}
      >
        <div ref={contentRef}>
          <div className={cn(
            'px-6 pb-6 pt-1',
            isDark ? 'text-cinema-300' : 'text-gray-600',
          )}>
            {item.children}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PremiumAccordion({
  items,
  defaultOpen,
  variant = 'light',
  className,
  allowMultiple = false,
}: PremiumAccordionProps) {
  const [openIds, setOpenIds] = useState<Set<string>>(
    defaultOpen ? new Set([defaultOpen]) : new Set()
  )

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (!allowMultiple) next.clear()
        next.add(id)
      }
      return next
    })
  }

  const isDark = variant === 'dark'

  return (
    <div className={cn(
      'rounded-2xl overflow-hidden shadow-sm',
      isDark ? 'bg-white/4 border border-white/8' : 'bg-white border border-gray-100',
      className,
    )}>
      {items.map((item) => (
        <AccordionRow
          key={item.id}
          item={item}
          isOpen={openIds.has(item.id)}
          onToggle={() => toggle(item.id)}
          variant={variant}
        />
      ))}
    </div>
  )
}
