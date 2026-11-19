import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";

import type { Clinic, Doctor, Media } from "@/payload-types";

import { openingHoursSpecification } from "./hours";

const clean = (value: string | null | undefined): string => stripMarkers(value)?.trim() ?? "";

/** The street on one line and city, state and ZIP code on the next, as the site prints addresses. */
export function clinicAddressLines(clinic: Pick<Clinic, "address">): string[] {
  const street = clean(clinic.address?.street);
  const city = clean(clinic.address?.city);
  const regionAndCode = [clean(clinic.address?.region), clean(clinic.address?.postalCode)]
    .filter(Boolean)
    .join(" ");
  const cityLine = [city, regionAndCode].filter(Boolean).join(", ");

  return [street, cityLine].filter(Boolean);
}

const hasCoordinates = (geo: Clinic["geo"]): geo is { latitude: number; longitude: number } =>
  typeof geo?.latitude === "number" && typeof geo.longitude === "number";

/** A Google Maps embed centred on the clinic's pin, or on its address when no pin is set. */
export function clinicMapEmbedUrl(
  clinic: Pick<Clinic, "address" | "geo">,
  locale: string
): string | null {
  const query = hasCoordinates(clinic.geo)
    ? `${clinic.geo.latitude},${clinic.geo.longitude}`
    : clinicAddressLines(clinic).join(", ");

  if (!query) {
    return null;
  }

  const params = new URLSearchParams({ hl: locale, output: "embed", q: query, z: "15" });

  return `https://maps.google.com/maps?${params.toString()}`;
}

const absoluteUrl = (url: string | null | undefined, baseUrl: string): string | undefined => {
  const value = clean(url);

  if (!value) {
    return undefined;
  }

  return /^https?:\/\//iu.test(value)
    ? value
    : `${baseUrl}${value.startsWith("/") ? "" : "/"}${value}`;
};

interface ClinicJsonLdInput {
  clinic: Clinic;
  doctors: Doctor[];
  /** The page's full URL, locale prefix included. */
  pageUrl: string;
  /** Doctor page URLs by doctor id, locale prefix included. */
  doctorUrls: Map<number | string, string>;
  /** The organisation's name, for example from the header's site name. */
  organizationName?: string | null;
  baseUrl: string;
}

const withoutEmpty = (data: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== "" &&
        !(Array.isArray(value) && value.length === 0)
    )
  );

/** The clinic as a schema.org MedicalClinic, built only from the record's own fields. */
export function clinicJsonLd({
  clinic,
  doctors,
  pageUrl,
  doctorUrls,
  organizationName,
  baseUrl,
}: ClinicJsonLdInput): Record<string, unknown> {
  const clinicName = clean(clinic.name);
  const organization = clean(organizationName);
  const photo = clinic.photo && typeof clinic.photo === "object" ? (clinic.photo as Media) : null;
  const rating = clinic.rating;
  const ratingCount = rating?.count ?? 0;

  return withoutEmpty({
    "@context": "https://schema.org",
    "@id": `${pageUrl}#clinic`,
    "@type": "MedicalClinic",
    address: withoutEmpty({
      "@type": "PostalAddress",
      addressCountry: "US",
      addressLocality: clean(clinic.address?.city),
      addressRegion: clean(clinic.address?.region),
      postalCode: clean(clinic.address?.postalCode),
      streetAddress: clean(clinic.address?.street),
    }),
    aggregateRating:
      typeof rating?.value === "number" && ratingCount > 0
        ? {
            "@type": "AggregateRating",
            bestRating: 5,
            ratingValue: rating.value,
            reviewCount: ratingCount,
            worstRating: 1,
          }
        : undefined,
    areaServed: (clinic.locatedNear ?? [])
      .map(clean)
      .filter(Boolean)
      .map((name) => ({ "@type": "Place", name })),
    description: clean(clinic.description),
    employee: doctors.map((doctor) =>
      withoutEmpty({
        "@type": "Person",
        jobTitle: clean(doctor.jobTitle),
        name: clean(doctor.name),
        url: doctorUrls.get(doctor.id),
      })
    ),
    geo: hasCoordinates(clinic.geo)
      ? {
          "@type": "GeoCoordinates",
          latitude: clinic.geo.latitude,
          longitude: clinic.geo.longitude,
        }
      : undefined,
    hasMap: clean(clinic.mapUrl),
    image: absoluteUrl(photo?.url, baseUrl),
    name: organization ? `${organization} ${clinicName}` : clinicName,
    openingHoursSpecification: openingHoursSpecification(clinic.hours),
    parentOrganization: organization
      ? { "@type": "MedicalOrganization", name: organization, url: baseUrl }
      : undefined,
    telephone: clean(clinic.phone),
    url: pageUrl,
  });
}
