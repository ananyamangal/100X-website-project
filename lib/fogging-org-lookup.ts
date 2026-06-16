// Batch-enriches procurement docs with organization_name + organization_canonical
// by joining buyer_canonical → fogging_organizations.buyer_canonicals[]
import { Db } from 'mongodb';

export async function enrichWithOrg(
  db: Db,
  docs: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  const canonicals = [...new Set(
    docs.map(d => d.buyer_canonical as string).filter(Boolean)
  )];
  if (!canonicals.length) return docs;

  const orgs = await db.collection('fogging_organizations')
    .find({ buyer_canonicals: { $in: canonicals } })
    .project({ organization_canonical: 1, organization_name: 1, buyer_canonicals: 1 })
    .toArray();

  const m = new Map<string, { organization_name: string; organization_canonical: string }>();
  for (const org of orgs) {
    for (const bc of (org.buyer_canonicals as string[]) ?? []) {
      if (!m.has(bc)) m.set(bc, {
        organization_name:      org.organization_name      as string,
        organization_canonical: org.organization_canonical as string,
      });
    }
  }

  return docs.map(d => {
    const bc = d.buyer_canonical as string;
    const o  = m.get(bc);
    return {
      ...d,
      organization_name:      o?.organization_name      ?? (d.buyer_display_name as string) ?? bc,
      organization_canonical: o?.organization_canonical ?? null,
    };
  });
}
