import Container from "../primitives/Container"
import AnimatedCounter from "./AnimatedCounter"

export type TrustStripItem = {
  /**
   * Numeric value to count up to. Alternatively pass `displayValue`
   * for non-numeric values like "GeM Q2" or "Pan India".
   */
  to?: number
  prefix?: string
  suffix?: string
  /** When set, takes precedence over the numeric counter. */
  displayValue?: string
  label: string
}

type Props = {
  items: TrustStripItem[]
}

/**
 * Horizontal authority rail under the hero. Animated counters fire on
 * viewport enter; non-numeric stats render as static text. Borders top
 * & bottom anchor it visually to the hero without competing for color.
 */
export default function TrustStrip({ items }: Props) {
  if (!items.length) return null
  return (
    <section
      aria-label="Authority signals"
      className="relative border-y border-[var(--rd-border)] bg-[var(--rd-surface-1)]/40"
    >
      <Container>
        <ul className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-y-8 gap-x-4 py-8 md:py-10 list-none">
          {items.map((item, i) => (
            <li key={i} className="text-center">
              <div className="text-2xl md:text-4xl font-bold tracking-tight text-[var(--rd-accent)] tabular-nums">
                {item.displayValue != null ? (
                  item.displayValue
                ) : (
                  <AnimatedCounter
                    to={item.to ?? 0}
                    prefix={item.prefix}
                    suffix={item.suffix}
                  />
                )}
              </div>
              <div className="mt-1 text-[10px] md:text-xs font-semibold uppercase tracking-[0.14em] text-[var(--rd-text-muted)]">
                {item.label}
              </div>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  )
}
