import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";
import React from "react";

import { withLocalePrefix } from "@/lib/config/entityRoutes";
import { entityDocPath } from "@/lib/site/links";
import type { Locale } from "@/lib/types";
import { getServerSideURL } from "@/lib/utils/getURL";
import type { Clinic } from "@/payload-types";

import { clinicJsonLd } from "./clinicData";
import { findClinicDoctors } from "./doctors";

interface Props {
  clinic: Clinic;
  locale: Locale;
  /** The page's path without the locale prefix, for example /locations/texas/allen. */
  path: string;
  organizationName?: string | null;
}

/** The clinic's structured data for search engines, from the record's own fields. */
export async function ClinicJsonLd({ clinic, locale, path, organizationName }: Props) {
  const baseUrl = getServerSideURL();
  const doctors = await findClinicDoctors(clinic.id, locale);
  const doctorUrls = new Map(
    doctors.flatMap((doctor) => {
      const doctorPath = entityDocPath("doctors", doctor);

      return doctorPath ? [[doctor.id, `${baseUrl}${withLocalePrefix(doctorPath, locale)}`]] : [];
    })
  );
  const data = clinicJsonLd({
    baseUrl,
    clinic,
    doctorUrls,
    doctors,
    organizationName,
    pageUrl: `${baseUrl}${withLocalePrefix(path, locale)}`,
  });
  // Escaping "<" keeps editor text from closing the script element early.
  const json = JSON.stringify(stripMarkers(data)).replaceAll("<", "\\u003c");

  return <script dangerouslySetInnerHTML={{ __html: json }} type="application/ld+json" />;
}
