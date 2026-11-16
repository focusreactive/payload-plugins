import React from "react";

import type { SiteBlockProps } from "@/blocks/site/types";
import { findEntities, idOf } from "@/dal/entities";
import type { State, StateSitesBlock } from "@/payload-types";

import { ClinicSites } from "./ClinicSites";
import { findStateClinics, stateMapKey, toClinicSite } from "./stateData";

async function resolveState(
  picked: StateSitesBlock["state"],
  { context, locale }: Pick<SiteBlockProps<StateSitesBlock>, "context" | "locale">
): Promise<State | null> {
  if (picked) {
    const [state] = await findEntities("states", {
      depth: 0,
      limit: 1,
      locale,
      where: { id: { equals: idOf(picked) } },
    });

    return state ?? null;
  }

  return context?.collection === "states" ? context.doc : null;
}

/** The state page's `region_section`: a map of the state's clinics and the list of them. */
export async function StateSitesComponent({
  state,
  reviewsLabel,
  linkText,
  context,
  locale,
}: SiteBlockProps<StateSitesBlock>) {
  const stateDoc = await resolveState(state, { context, locale });

  if (!stateDoc) {
    return null;
  }

  const clinics = await findStateClinics(stateDoc.id, locale);

  return (
    <section className="region_section">
      <div className="container">
        <ClinicSites
          linkText={linkText ?? ""}
          mapKey={stateMapKey(stateDoc)}
          reviewsLabel={reviewsLabel ?? ""}
          sites={clinics.map((clinic) => toClinicSite(clinic, locale))}
          variant="region"
        />
      </div>
    </section>
  );
}
