import { MapPin } from "lucide-react"
import Container from "../primitives/Container"
import Section from "../primitives/Section"
import SectionHeading from "../primitives/SectionHeading"
import Card from "../primitives/Card"

export type Deployment = {
  /** Client name (or sector category if confidential). */
  client: string
  /** Free-form location label — "Lucknow, UP" / "Eastern India". */
  location?: string
  /** Machine SKU / category deployed. */
  machine: string
  /** Single-sentence outcome — quantitative when possible. */
  outcome: string
  /** Optional buyer category for chips ("Municipal", "Cantonment", "Hospital"). */
  category?: string
}

const DEFAULT: Deployment[] = [
  {
    client: "Municipal Corporation (Tier-1)",
    location: "North India",
    machine: "Double-barrel vehicle-mounted fogger × 120 units",
    outcome: "Pre-monsoon ward-level deployment; full city coverage in vector-control drive.",
    category: "Municipal",
  },
  {
    client: "State Health Department",
    location: "Eastern India",
    machine: "Vehicle-mounted thermal foggers",
    outcome: "Deployed across 14 districts for dengue & chikungunya control.",
    category: "Government",
  },
  {
    client: "Cantonment Board",
    location: "Western India",
    machine: "SS-tank thermal foggers × 24 units",
    outcome: "Year-round campus + quarters sanitation including hospital wing.",
    category: "Cantonment",
  },
  {
    client: "Industrial township",
    location: "Gujarat",
    machine: "100XTFS50 (thermal + cold)",
    outcome: "Indoor disinfection routine + outdoor mosquito control on a 90-acre site.",
    category: "Industry",
  },
  {
    client: "RWA cluster",
    location: "NCR",
    machine: "Portable thermal foggers × 8 units",
    outcome: "Twice-weekly drive across 12 societies through dengue season.",
    category: "Society",
  },
  {
    client: "Poultry & dairy network",
    location: "Andhra Pradesh",
    machine: "SS-tank thermal foggers",
    outcome: "Disease-prevention sanitation across 30+ farms; vendor-supplied operator training.",
    category: "Agriculture",
  },
]

type Props = {
  items?: Deployment[]
  eyebrow?: string
  title?: string
  sub?: string
}

/**
 * Deployment proof showcase — six tile cards spanning municipal,
 * government, cantonment, industry, residential, and agriculture
 * sectors. Optimised for procurement officers scanning for "people
 * like us" buy signals.
 */
export default function DeploymentShowcase({
  items = DEFAULT,
  eyebrow = "Deployments",
  title = "Where 100x Circle machines are running today.",
  sub = "Six sectors. One supply spine. From municipal vector-control drives to poultry sanitation, our equipment is in the field.",
}: Props) {
  if (!items.length) return null
  return (
    <Section tone="bg" ariaLabelledBy="deployments-heading">
      <Container>
        <SectionHeading eyebrow={eyebrow} title={title} sub={sub} id="deployments-heading" />
        <ul className="mt-12 md:mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 list-none">
          {items.map((d, i) => (
            <li key={i}>
              <Card tone="solid" interactive className="h-full p-6 md:p-7">
                {d.category ? (
                  <span className="inline-block mb-4 rounded-full border border-[var(--rd-border-strong)] bg-[var(--rd-surface-2)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--rd-text-muted)]">
                    {d.category}
                  </span>
                ) : null}
                <h3 className="text-lg md:text-xl font-bold text-[var(--rd-text)] leading-tight">
                  {d.client}
                </h3>
                {d.location ? (
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-[var(--rd-text-muted)]">
                    <MapPin size={12} aria-hidden="true" />
                    {d.location}
                  </p>
                ) : null}
                <p className="mt-4 text-sm font-medium text-[var(--rd-accent)]">
                  {d.machine}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--rd-text-muted)]">
                  {d.outcome}
                </p>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  )
}
