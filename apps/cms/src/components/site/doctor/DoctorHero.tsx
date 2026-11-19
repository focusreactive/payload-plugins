import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";
import React from "react";

import { SiteBackground, SiteImage, mediaOf } from "@/components/site/SiteImage";
import type { Doctor } from "@/payload-types";

import { ClinicLinks, clinicsOf } from "./ClinicLinks";

interface Props {
  doctor: Doctor;
  locale: string;
}

/** The top of a doctor's page, from the record: badge, name, job title, clinics and photos. */
export function DoctorHero({ doctor, locale }: Props) {
  const clinics = clinicsOf(doctor.clinics);
  const badge = stripMarkers(doctor.featuredLabel)?.trim();

  return (
    <section id="hero">
      {mediaOf(doctor.heroImage) && (
        <SiteBackground className="bg-container first desktop" media={doctor.heroImage} />
      )}
      <div className="container">
        {badge && (
          <div className="featured-label doctor">
            <span>{doctor.featuredLabel}</span>
          </div>
        )}
        <h1>{doctor.name}</h1>
        {doctor.jobTitle && <p>{doctor.jobTitle}</p>}
        {clinics.length > 0 && (
          // The original wraps the list in a `p`, which the browser splits into two empty ones.
          <>
            <p />
            <ClinicLinks clinics={clinics} locale={locale} />
            <p />
          </>
        )}
        {mediaOf(doctor.photo) && (
          <figure className="circle">
            <SiteImage media={doctor.photo} />
          </figure>
        )}
      </div>
    </section>
  );
}
