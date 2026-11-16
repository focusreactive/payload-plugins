import { findEntities } from "@/dal/entities";
import type { Locale } from "@/lib/types";
import type { Doctor } from "@/payload-types";

/** The doctors whose Clinics list includes this clinic, by name. */
export function findClinicDoctors(clinicId: number | string, locale: Locale): Promise<Doctor[]> {
  return findEntities("doctors", {
    locale,
    sort: "name",
    where: { clinics: { in: [clinicId] } },
  });
}
