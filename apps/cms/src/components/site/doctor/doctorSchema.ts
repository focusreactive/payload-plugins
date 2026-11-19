import { ENTITY_ROUTE_PREFIXES, withLocalePrefix } from "@/lib/config/entityRoutes";
import { clinicPath } from "@/lib/site/links";
import type { Clinic, Doctor, Media } from "@/payload-types";

import { clinicsOf } from "./ClinicLinks";

type JsonValue = string | number | boolean | JsonValue[] | { [key: string]: JsonValue | undefined };
type JsonObject = Record<string, JsonValue | undefined>;

interface DoctorSchemaInput {
  doctor: Doctor;
  locale: string;
  /** The page's path without the locale prefix, for example /vein-doctors/dr-jane-smith. */
  path: string;
  baseUrl: string;
  siteName?: string | null;
  sitePhone?: string | null;
}

const BREADCRUMB_TEXT = {
  en: { doctors: "Doctors", home: "Home" },
  es: { doctors: "Doctores", home: "Inicio" },
} as const;

const PHYSICIAN_OCCUPATION = {
  "@type": "Occupation",
  name: "Physician",
  occupationalCategory: "29-1229 Physicians",
} as const;

const listOrNothing = <TItem>(items: TItem[]): TItem[] | undefined =>
  items.length > 0 ? items : undefined;

const filledTexts = (values: string[] | null | undefined): string[] =>
  (values ?? []).map((value) => value.trim()).filter(Boolean);

function absoluteUrl(url: string | null | undefined, baseUrl: string): string | undefined {
  if (!url) {
    return undefined;
  }

  return url.startsWith("/") ? `${baseUrl}${url}` : url;
}

const imageUrl = (media: number | Media | null | undefined, baseUrl: string) =>
  typeof media === "object" && media ? absoluteUrl(media.url, baseUrl) : undefined;

function clinicNode(clinic: Clinic, locale: string, baseUrl: string, organizationId?: string) {
  const path = clinicPath(clinic);
  const url = path ? `${baseUrl}${withLocalePrefix(path, locale)}` : undefined;
  const { address } = clinic;

  return {
    "@id": url ? `${url}#clinic` : undefined,
    "@type": "MedicalClinic",
    address: address?.street
      ? {
          "@type": "PostalAddress",
          addressCountry: "US",
          addressLocality: address.city ?? undefined,
          addressRegion: address.region ?? undefined,
          postalCode: address.postalCode ?? undefined,
          streetAddress: address.street,
        }
      : undefined,
    image: imageUrl(clinic.photo, baseUrl),
    name: clinic.name,
    parentOrganization: organizationId ? { "@id": organizationId } : undefined,
    telephone: clinic.phone ?? undefined,
    url,
  } satisfies JsonObject;
}

/**
 * Structured data of a doctor's page, built from the record: the profile page, the doctor as a
 * `Person` whose occupation is Physician (schema.org's `Physician` type is an organization and
 * cannot carry schooling or credentials), the clinics the doctor works at, and the breadcrumb.
 */
export function doctorSchema({
  doctor,
  locale,
  path,
  baseUrl,
  siteName,
  sitePhone,
}: DoctorSchemaInput): JsonObject {
  const homeUrl = `${baseUrl}${withLocalePrefix("/", locale)}`;
  const indexUrl = `${baseUrl}${withLocalePrefix(`/${ENTITY_ROUTE_PREFIXES.doctors}`, locale)}`;
  const pageUrl = `${baseUrl}${withLocalePrefix(path, locale)}`;
  const personId = `${pageUrl}#person`;
  const profileId = `${pageUrl}#profile`;
  const breadcrumbId = `${pageUrl}#breadcrumb`;
  const websiteId = siteName ? `${baseUrl}/#website` : undefined;
  const organizationId = siteName ? `${baseUrl}/#organization` : undefined;
  const photo = imageUrl(doctor.photo, baseUrl);
  const clinics = clinicsOf(doctor.clinics).map((clinic) =>
    clinicNode(clinic, locale, baseUrl, organizationId)
  );
  const credentials = filledTexts(doctor.credentials);
  const npi = doctor.npi?.trim();
  const text = locale === "es" ? BREADCRUMB_TEXT.es : BREADCRUMB_TEXT.en;
  const breadcrumbs = [
    { name: text.home, url: homeUrl },
    { name: text.doctors, url: indexUrl },
    { name: doctor.name, url: pageUrl },
  ];

  const site: JsonObject[] =
    siteName && websiteId && organizationId
      ? [
          { "@id": websiteId, "@type": "WebSite", name: siteName, url: homeUrl },
          {
            "@id": organizationId,
            "@type": "MedicalOrganization",
            name: siteName,
            telephone: sitePhone ?? undefined,
            url: homeUrl,
          },
        ]
      : [];

  return {
    "@context": "https://schema.org",
    "@graph": [
      ...site,
      {
        "@id": profileId,
        "@type": ["ProfilePage", "WebPage"],
        about: { "@id": personId },
        breadcrumb: { "@id": breadcrumbId },
        inLanguage: locale,
        isPartOf: websiteId ? { "@id": websiteId } : undefined,
        mainEntity: { "@id": personId },
        name: doctor.name,
        primaryImageOfPage: photo ? { "@type": "ImageObject", url: photo } : undefined,
        url: pageUrl,
      },
      {
        "@id": personId,
        "@type": "Person",
        affiliation: organizationId ? { "@id": organizationId } : undefined,
        alumniOf: listOrNothing(
          (doctor.education ?? []).map((institution) => ({
            "@type": institution.kind === "hospital" ? "Hospital" : "CollegeOrUniversity",
            name: institution.name,
          }))
        ),
        hasCredential: listOrNothing(
          credentials.map((credential) => ({
            "@type": "EducationalOccupationalCredential",
            name: credential,
          }))
        ),
        hasOccupation: PHYSICIAN_OCCUPATION,
        honorificSuffix: credentials.length > 0 ? credentials.join(", ") : undefined,
        identifier: npi ? { "@type": "PropertyValue", propertyID: "NPI", value: npi } : undefined,
        image: photo,
        jobTitle: doctor.jobTitle ?? undefined,
        knowsAbout: listOrNothing(filledTexts(doctor.specialties)),
        knowsLanguage: listOrNothing(filledTexts(doctor.languages)),
        mainEntityOfPage: { "@id": profileId },
        name: doctor.name,
        sameAs: listOrNothing(filledTexts(doctor.profiles)),
        url: pageUrl,
        workLocation: listOrNothing(
          clinics.flatMap((clinic) => (clinic["@id"] ? [{ "@id": clinic["@id"] }] : []))
        ),
        worksFor: organizationId ? { "@id": organizationId } : undefined,
      },
      ...clinics,
      {
        "@id": breadcrumbId,
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((crumb, index) => ({
          "@type": "ListItem",
          item: crumb.url,
          name: crumb.name,
          position: index + 1,
        })),
      },
    ],
  };
}
