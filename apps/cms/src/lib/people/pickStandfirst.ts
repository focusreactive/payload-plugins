import type { Person } from "@/payload-types";

export interface ListingContext {
  serviceId: number | null;
  markets: string[];
}

function relationId(value: number | { id: number } | null | undefined) {
  if (value == null) return null;
  return typeof value === "object" ? value.id : value;
}

/**
 * The standfirst a person shows on one listing. A contextual entry applies only when everything
 * it names matches the listing, so an entry for Patents in Canada never shows on a Patents page
 * listing Japan; among the ones that apply, the one naming both a service and a market wins.
 * Anything else falls back to the person's default standfirst.
 */
export function pickStandfirst(
  person: Pick<Person, "standfirst" | "contextualStandfirsts">,
  context: ListingContext
): string | null {
  let best: { text: string; specificity: number } | null = null;
  for (const entry of person.contextualStandfirsts ?? []) {
    const serviceId = relationId(entry.service);
    if (!entry.text || (serviceId === null && !entry.market)) continue;
    if (serviceId !== null && serviceId !== context.serviceId) continue;
    if (entry.market && !context.markets.includes(entry.market)) continue;
    const specificity = (serviceId === null ? 0 : 1) + (entry.market ? 1 : 0);
    if (!best || specificity > best.specificity) best = { text: entry.text, specificity };
  }
  return best?.text ?? person.standfirst ?? null;
}
