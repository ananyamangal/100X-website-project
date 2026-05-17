import Link from "next/link"
import { cn } from "@/lib/utils"
import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"

type Variant = "primary" | "secondary" | "ghost" | "whatsapp"
type Size = "md" | "lg"

type BaseProps = {
  children: ReactNode
  className?: string
  variant?: Variant
  size?: Size
  /** Show a right-arrow icon after the label. */
  trailing?: boolean
  /** GTM marker — auto-picked up by the global click listener. */
  dataGtm?: string
}

const SIZE_CLASS: Record<Size, string> = {
  md: "px-5 py-3 text-sm",
  lg: "px-7 py-3.5 text-base",
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary:
    "bg-[var(--rd-accent)] text-black font-semibold hover:bg-[var(--rd-accent-hover)] shadow-[var(--rd-shadow-accent)] hover:-translate-y-0.5",
  secondary:
    "border border-[var(--rd-border-strong)] bg-[var(--rd-surface-1)] text-[var(--rd-text)] font-semibold hover:border-[var(--rd-accent)] hover:text-[var(--rd-accent)]",
  ghost:
    "text-[var(--rd-text)] font-medium hover:text-[var(--rd-accent)]",
  whatsapp:
    "bg-[#25d366] text-white font-semibold hover:bg-[#1ebd5b] shadow-[0_4px_20px_rgba(37,211,102,0.28)] hover:-translate-y-0.5",
}

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-[var(--rd-radius-button)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--rd-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--rd-bg)]"

type LinkProps = BaseProps & {
  href: string
  type?: never
  onClick?: never
  /** External-link openInNewTab gets noopener/noreferrer for free. */
  external?: boolean
}

type ButtonProps = BaseProps & {
  href?: never
  type?: "button" | "submit"
  onClick?: () => void
  external?: never
}

type Props = LinkProps | ButtonProps

/**
 * Single button primitive. Renders as <Link> when given href, otherwise
 * <button>. Variants tuned for black-industrial theme but defined via
 * the CSS variables so they restyle automatically when the theme tokens
 * change.
 */
export default function Button(props: Props) {
  const {
    children,
    className,
    variant = "primary",
    size = "md",
    trailing = false,
    dataGtm,
  } = props
  const cls = cn(BASE, SIZE_CLASS[size], VARIANT_CLASS[variant], className)

  const inner = (
    <>
      {children}
      {trailing ? <ArrowRight size={16} aria-hidden="true" /> : null}
    </>
  )

  if ("href" in props && props.href != null) {
    const isExternal = props.external || props.href.startsWith("http") || props.href.startsWith("tel:")
    return (
      <Link
        href={props.href}
        target={isExternal && !props.href.startsWith("tel:") ? "_blank" : undefined}
        rel={isExternal && !props.href.startsWith("tel:") ? "noopener noreferrer" : undefined}
        className={cls}
        data-gtm={dataGtm}
      >
        {inner}
      </Link>
    )
  }

  return (
    <button
      type={(props as ButtonProps).type ?? "button"}
      onClick={(props as ButtonProps).onClick}
      className={cls}
      data-gtm={dataGtm}
    >
      {inner}
    </button>
  )
}
