import React from "react";

import { withLocalePrefix } from "@/lib/config/entityRoutes";
import { clinicPath } from "@/lib/site/links";
import type { Clinic } from "@/payload-types";

/** Clinic names joined as the site writes them: "A, B & C", each linking to its clinic page. */
export function ClinicLinks({ clinics, locale }: { clinics: Clinic[]; locale: string }) {
  return (
    <div className="location-snippet">
      <div>
        {clinics.map((clinic, index) => {
          const path = clinicPath(clinic);
          const separator = index === 0 ? null : index === clinics.length - 1 ? " & " : ", ";

          return (
            <React.Fragment key={clinic.id}>
              {separator && <span className="locations-separator">{separator}</span>}
              <a href={path ? withLocalePrefix(path, locale) : undefined}>{clinic.name}</a>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

export const clinicsOf = (values: (number | Clinic)[] | null | undefined): Clinic[] =>
  (values ?? []).filter((value): value is Clinic => typeof value === "object" && value !== null);
