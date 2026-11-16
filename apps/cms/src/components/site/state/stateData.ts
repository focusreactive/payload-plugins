import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";

import { findEntities, idOf, orderByIds } from "@/dal/entities";
import { withLocalePrefix } from "@/lib/config/entityRoutes";
import { clinicPath } from "@/lib/site/links";
import type { Locale } from "@/lib/types";
import type { Clinic, Doctor, State } from "@/payload-types";

/** One clinic as the lists and the map show it. Plain data, so a client component can take it. */
export interface ClinicSite {
  key: string;
  name: string;
  href?: string;
  addressLines: string[];
  reviewCount?: number;
  stars: number;
  latitude?: number;
  longitude?: number;
}

const DEFAULT_STARS = 5;

export function toClinicSite(clinic: Clinic, locale: Locale): ClinicSite {
  const path = clinicPath(clinic);
  const { address, geo, rating } = clinic;
  const cityLine = [address?.city, [address?.region, address?.postalCode].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");

  return {
    addressLines: [address?.street, cityLine].flatMap((line) => (line ? [line] : [])),
    href: path ? withLocalePrefix(path, locale) : undefined,
    key: stripMarkers(clinic.slug) || String(clinic.id),
    latitude: geo?.latitude ?? undefined,
    longitude: geo?.longitude ?? undefined,
    name: clinic.name,
    reviewCount: rating?.count ?? undefined,
    stars: Math.round(rating?.value ?? DEFAULT_STARS),
  };
}

/** The key the original map script reads from `data-location`: the state's two letters. */
export const stateMapKey = (state: Pick<State, "abbreviation" | "slug">): string =>
  (stripMarkers(state.abbreviation) || stripMarkers(state.slug) || "").toLowerCase();

export const stateIdOf = (clinic: Clinic): number | string | null =>
  clinic.state ? idOf(clinic.state) : null;

/** Every published clinic of one state, by name. Depth 1 populates the state for the URL. */
export function findStateClinics(stateId: number | string, locale: Locale): Promise<Clinic[]> {
  return findEntities("clinics", {
    locale,
    sort: "name",
    where: { state: { equals: stateId } },
  });
}

/**
 * The doctors of a state: the picked ones in their order, else every doctor with a clinic in the
 * state. Depth 2 populates each doctor's clinics and their states, for the clinic links.
 */
export async function findStateDoctors(
  picked: (number | Doctor)[] | null | undefined,
  stateId: number | string | null,
  locale: Locale
): Promise<Doctor[]> {
  if (picked?.length) {
    const ids = picked.map(idOf);
    const docs = await findEntities("doctors", {
      depth: 2,
      locale,
      where: { id: { in: ids } },
    });

    return orderByIds(docs, ids);
  }

  if (stateId === null) {
    return findEntities("doctors", { depth: 2, locale, sort: "name" });
  }

  const clinics = await findEntities("clinics", {
    depth: 0,
    locale,
    where: { state: { equals: stateId } },
  });

  if (clinics.length === 0) {
    return [];
  }

  return findEntities("doctors", {
    depth: 2,
    locale,
    sort: "name",
    where: { clinics: { in: clinics.map((clinic) => clinic.id) } },
  });
}

/** A label typed with a `{name}` placeholder, filled with a state or area name. */
export const fillName = (template: string | null | undefined, name: string): string =>
  (template ?? "").replaceAll("{name}", name);
