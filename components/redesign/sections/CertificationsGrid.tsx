import { Award, BadgeCheck, FileCheck, Globe2, ShieldCheck, Stamp } from "lucide-react"
import Container from "../primitives/Container"
import Section from "../primitives/Section"
import SectionHeading from "../primitives/SectionHeading"
import Card from "../primitives/Card"

type CertItem = {
  icon: "badge" | "shield" | "award" | "stamp" | "file" | "globe"
  label: string
  sub?: string
}

const ICON: Record<CertItem["icon"], typeof Award> = {
  badge: BadgeCheck,
  shield: ShieldCheck,
  award: Award,
  stamp: Stamp,
  file: FileCheck,
  globe: Globe2,
}

const DEFAULT_CERTS: CertItem[] = [
  { icon: "stamp", label: "GeM Q2 OEM", sub: "Approved manufacturer" },
  { icon: "shield", label: "BIS-aligned manufacturing", sub: "Indian Standards spec mapping" },
  { icon: "file", label: "GST-invoiced supply", sub: "Pan-India compliant dispatch" },
  { icon: "badge", label: "ISO process discipline", sub: "Documented quality flow" },
  { icon: "award", label: "10+ years in production", sub: "Continuous operating heritage" },
  { icon: "globe", label: "Pan-India service", sub: "Spares + support in every state" },
]

type Props = {
  items?: CertItem[]
  eyebrow?: string
  title?: string
  sub?: string
}

/**
 * Certifications + compliance grid. Icon-led cards instead of partner
 * logos (no licensing risk; mirrors the Apple/Tesla minimalism brief).
 * Swap to real cert logo PNGs in a follow-up once you provide the asset
 * pack.
 */
export default function CertificationsGrid({
  items = DEFAULT_CERTS,
  eyebrow = "Certifications & compliance",
  title = "Audited, documented, deliverable.",
  sub = "Every machine ships with the documentation procurement teams ask for — and the manufacturing discipline behind it.",
}: Props) {
  return (
    <Section tone="surface" ariaLabelledBy="certs-heading">
      <Container>
        <SectionHeading eyebrow={eyebrow} title={title} sub={sub} id="certs-heading" />
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 list-none">
          {items.map((c, i) => {
            const Icon = ICON[c.icon]
            return (
              <li key={i}>
                <Card tone="outlined" className="flex items-center gap-4 p-5 md:p-6">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--rd-accent-soft)] text-[var(--rd-accent)] shrink-0">
                    <Icon size={20} aria-hidden="true" strokeWidth={2} />
                  </span>
                  <span>
                    <div className="text-sm md:text-base font-semibold text-[var(--rd-text)]">
                      {c.label}
                    </div>
                    {c.sub ? (
                      <div className="mt-0.5 text-xs md:text-sm text-[var(--rd-text-muted)]">
                        {c.sub}
                      </div>
                    ) : null}
                  </span>
                </Card>
              </li>
            )
          })}
        </ul>
      </Container>
    </Section>
  )
}
