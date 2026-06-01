"use client"

import { useEffect, useRef, type ReactNode, type CSSProperties, type ElementType } from "react"

type Animation = "fade-up" | "fade-down" | "fade-left" | "fade-right" | "scale" | "fade"

interface Props {
  children: ReactNode
  animation?: Animation
  delay?: number
  threshold?: number
  className?: string
  style?: CSSProperties
  once?: boolean
  as?: ElementType
}

export default function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  threshold = 0.12,
  className = "",
  style,
  once = true,
  as: Tag = "div",
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const timer = setTimeout(() => {
            el.classList.add("is-visible")
          }, delay)
          if (once) observer.disconnect()
          return () => clearTimeout(timer)
        } else if (!once) {
          el.classList.remove("is-visible")
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [delay, threshold, once])

  return (
    <Tag
      ref={ref as any}
      className={`reveal reveal-${animation} ${className}`}
      style={style}
    >
      {children}
    </Tag>
  )
}
