import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";
import React from "react";

import type { SiteBlockProps } from "@/blocks/site/types";
import { SiteImage } from "@/components/site/SiteImage";
import { InlineRichText, SiteRichText, hasRichText } from "@/components/site/SiteRichText";
import { findEntities } from "@/dal/entities";
import { withLocalePrefix } from "@/lib/config/entityRoutes";
import { entityDocPath } from "@/lib/site/links";
import type { Clinic, ClinicInfoBlock, Doctor } from "@/payload-types";

import { clinicMapEmbedUrl } from "./clinicData";
import { findClinicDoctors } from "./doctors";
import { clinicHoursLines } from "./hours";

async function resolveClinic({
  clinic,
  context,
  locale,
}: Pick<SiteBlockProps<ClinicInfoBlock>, "clinic" | "context" | "locale">): Promise<Clinic | null> {
  if (clinic && typeof clinic === "object") {
    return clinic;
  }

  if (clinic) {
    const [doc] = await findEntities("clinics", {
      limit: 1,
      locale,
      where: { id: { equals: clinic } },
    });

    return doc ?? null;
  }

  return context?.collection === "clinics" ? context.doc : null;
}

function DoctorSnippet({
  doctor,
  buttonText,
  locale,
}: {
  doctor: Doctor;
  buttonText?: string | null;
  locale: string;
}) {
  const path = entityDocPath("doctors", doctor);

  return (
    <div className="doctor-snippet">
      <figure className="circle">
        <SiteImage media={doctor.photo} />
      </figure>
      <div className="content-wrapper">
        <h4>{doctor.name}</h4>
        {doctor.jobTitle && <p>{doctor.jobTitle}</p>}
        {path && (
          <a className="button border small" href={withLocalePrefix(path, locale)}>
            {buttonText ? `${buttonText} ${doctor.name}` : doctor.name}
          </a>
        )}
      </div>
    </div>
  );
}

function ClinicMap({ clinic, locale }: { clinic: Clinic; locale: string }) {
  const src = clinicMapEmbedUrl(clinic, locale);

  return (
    <div
      className="single map-container"
      data-location={stripMarkers(clinic.slug) ?? undefined}
      id="location-map"
      style={{ position: "relative" }}
    >
      {src && (
        <iframe
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={src}
          style={{ border: 0, height: "100%", inset: 0, position: "absolute", width: "100%" }}
          title={stripMarkers(clinic.name) ?? undefined}
        />
      )}
    </div>
  );
}

/**
 * The clinic page's main section: accreditation, doctors, the page's text and a map in the wide
 * column, and opening hours, directions and nearby areas beside it. Every fact about the clinic
 * comes from the clinic record, so an edit there shows here and on every other page that lists it.
 */
export async function ClinicSidebarComponent({
  clinic: pickedClinic,
  accredit,
  doctorButton,
  text,
  hoursHeading,
  directionsHeading,
  directions,
  nearHeading,
  locale,
  context,
}: SiteBlockProps<ClinicInfoBlock>) {
  const clinic = await resolveClinic({ clinic: pickedClinic, context, locale });

  if (!clinic) {
    return null;
  }

  const doctors = await findClinicDoctors(clinic.id, locale);
  const hours = clinicHoursLines(clinic.hours, locale);
  const nearby = (clinic.locatedNear ?? []).filter((place) => stripMarkers(place)?.trim());
  const showAccreditation =
    clinic.accredited && (hasRichText(accredit?.heading) || hasRichText(accredit?.text));

  return (
    <section className="sidebar">
      <div className="container">
        <div className={doctors.length > 1 ? "text-container multiple-doctors" : "text-container"}>
          {showAccreditation && (
            <section className="media_text right small lightest-blue" id="lac-cred">
              <div className="container">
                <div className="text-container">
                  {hasRichText(accredit?.heading) && (
                    <h2>
                      <InlineRichText data={accredit?.heading} />
                    </h2>
                  )}
                  <SiteRichText data={accredit?.text} locale={locale} />
                </div>
                <div className="bg-wrapper imaged-location">
                  <SiteImage className="bg-container" media={accredit?.image} />
                </div>
              </div>
            </section>
          )}
          {doctors.map((doctor) => (
            <DoctorSnippet
              buttonText={doctorButton}
              doctor={doctor}
              key={doctor.id}
              locale={locale}
            />
          ))}
          <SiteRichText data={text} locale={locale} />
          <ClinicMap clinic={clinic} locale={locale} />
        </div>
        <aside>
          {hoursHeading && <h3>{hoursHeading}</h3>}
          <ul>
            {hours.map((line) => (
              <li key={line.day}>
                <strong>{line.label}</strong> {line.text}
              </li>
            ))}
          </ul>
          {directionsHeading && <h3 id="directions">{directionsHeading}</h3>}
          <SiteRichText data={directions} locale={locale} />
          {nearby.length > 0 && (
            <>
              {nearHeading && <h3>{nearHeading}</h3>}
              <p>
                {nearby.map((place, index) => (
                  <React.Fragment key={`${place}-${index}`}>
                    {index > 0 && <br />}
                    {place}
                  </React.Fragment>
                ))}
              </p>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
