import { Landmark, ShieldCheck, Truck } from "lucide-react"
import Container from "../primitives/Container"
import Section from "../primitives/Section"
import SectionHeading from "../primitives/SectionHeading"
import Card from "../primitives/Card"

type Pillar = {
  icon: "landmark" | "shield" | "truck"
  title: string
  body: string
}

const ICON: Record<Pillar["icon"], typeof Landmark> = {
  landmark: Landmark,
  shield: ShieldCheck,
  truck: Truck,
}

const DEFAULT_PILLARS: Pillar[] = [
  {
    icon: "landmark",
    title: "GeM-approved OEM",
    body: "Registered under Q2 (Fogging Machines). OEM Reseller Authorization for tender-compliant supply to municipal corporations and government health departments.",
  },
  {
    icon: "shield",
    title: "Tender-spec compliant",
    body: "Every SKU mapped to current GeM technical specifications. BIS-aligned manufacturing, GST-invoiced dispatch, complete compliance documentation supplied with each consignment.",
  },
  {
    icon: "truck",
    title: "Pan-India delivery",
    body: "Direct factory dispatch from Gurugram across every Indian state. 24–72 hour transit for in-stock models, confirmed delivery commitments on bulk and tender orders.",
  },
]

type Props = {
  /** Override the default 3-pillar copy if a page needs a different angle. */
  pillars?: Pillar[]
  eyebrow?: string
  title?: string
  sub?: string
}

/**
 * Government / OEM trust block. Positioned right after the trust strip
 * on government-buyer-focused pages. Three pillars: authority, compliance,
 * delivery — the order procurement officers care about.
 */
export default function GovTrustBlock({
  pillars = DEFAULT_PILLARS,
  eyebrow = "Government & institutional supply",
  title = "Built for procurement, audited by purpose.",
  sub = "100x Circle is an authorised OEM on the Government e-Marketplace. Our manufacturing, documentation, and dispatch are built end-to-end for tender, GeM, and institutional orders across India.",
}: Props) {
  return (
    <Section tone="bg" ariaLabelledBy="gov-trust-heading">
      <Container>
        <SectionHeading eyebrow={eyebrow} title={title} sub={sub} id="gov-trust-heading" />
        <ul className="mt-12 md:mt-16 grid gap-5 md:grid-cols-3 list-none">
          {pillars.map((p, i) => {
            const Icon = ICON[p.icon]
            return (
              <li key={i}>
                <Card tone="solid" interactive className="h-full p-7 md:p-8">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--rd-accent-soft)] text-[var(--rd-accent)]">
                    <Icon size={22} aria-hidden="true" strokeWidth={2} />
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-[var(--rd-text)]">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-sm md:text-base leading-relaxed text-[var(--rd-text-muted)]">
                    {p.body}
                  </p>
                </Card>
              </li>
            )
          })}
        </ul>
      </Container>
    </Section>
  )
}
