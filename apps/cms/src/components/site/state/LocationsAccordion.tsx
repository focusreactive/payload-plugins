import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";
import React from "react";

import type { SiteBlockProps } from "@/blocks/site/types";
import { findEntities, idOf } from "@/dal/entities";
import { withLocalePrefix } from "@/lib/config/entityRoutes";
import { entityDocPath } from "@/lib/site/links";
import type { Clinic, LocationsAccordionBlock, State } from "@/payload-types";

import { LocationsAccordionClient } from "./LocationsAccordionClient";
import type { LocationGroup } from "./LocationsAccordionClient";
import { fillName, stateIdOf, stateMapKey, toClinicSite } from "./stateData";

type Area = NonNullable<LocationsAccordionBlock["areas"]>[number];

// The original keys an area's map by its name in lower case with underscores: dallas_fort_worth.
const areaKey = (name: string): string =>
  name
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, "_")
    .replaceAll(/^_+|_+$/gu, "");

interface GroupInput {
  key: string;
  label: string;
  clinics: Clinic[];
  stateHref?: string;
}

function stateGroups(state: State, clinics: Clinic[], areas: Area[], locale: string): GroupInput[] {
  const statePath = entityDocPath("states", state);
  const stateHref = statePath ? withLocalePrefix(statePath, locale) : undefined;
  const stateAreas = areas.filter((area) => String(idOf(area.state)) === String(state.id));
  const assigned = new Set<string>();
  const groups: GroupInput[] = [];

  for (const area of stateAreas) {
    const areaIds = new Set((area.clinics ?? []).map((clinic) => String(idOf(clinic))));
    const areaClinics = clinics.filter((clinic) => areaIds.has(String(clinic.id)));

    for (const clinic of areaClinics) {
      assigned.add(String(clinic.id));
    }

    if (areaClinics.length > 0) {
      groups.push({
        clinics: areaClinics,
        key: areaKey(stripMarkers(area.name) ?? ""),
        label: `${state.name}: ${area.name}`,
        stateHref,
      });
    }
  }

  const rest = clinics.filter((clinic) => !assigned.has(String(clinic.id)));

  if (rest.length > 0) {
    groups.unshift({ clinics: rest, key: stateMapKey(state), label: state.name, stateHref });
  }

  return groups;
}

/**
 * The locations index's `#locations-accordion`: every state with its clinics, or a state split
 * into the areas the editor lists, each with a map.
 */
export async function LocationsAccordionComponent({
  areas,
  reviewsLabel,
  linkText,
  allLinkText,
  locale,
}: SiteBlockProps<LocationsAccordionBlock>) {
  const [states, clinics] = await Promise.all([
    findEntities("states", { depth: 0, locale, sort: "name" }),
    findEntities("clinics", { locale, sort: "name" }),
  ]);

  const groups: LocationGroup[] = states.flatMap((state) =>
    stateGroups(
      state,
      clinics.filter((clinic) => String(stateIdOf(clinic)) === String(state.id)),
      areas ?? [],
      locale
    ).map((group) => ({
      allLink: { href: group.stateHref, text: fillName(allLinkText, group.label) },
      key: group.key,
      label: group.label,
      sites: group.clinics.map((clinic) => toClinicSite(clinic, locale)),
    }))
  );

  return (
    <section id="locations-accordion">
      <div className="container">
        <LocationsAccordionClient
          groups={groups}
          linkText={linkText ?? ""}
          reviewsLabel={reviewsLabel ?? ""}
        />
      </div>
    </section>
  );
}
