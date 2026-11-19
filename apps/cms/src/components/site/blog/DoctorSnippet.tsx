import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";
import React from "react";

import { SiteImage } from "@/components/site/SiteImage";
import { entityPath, withLocalePrefix } from "@/lib/config/entityRoutes";
import type { Doctor } from "@/payload-types";

import { blogLabels } from "./labels";

/** The reviewing doctor at the end of an article: photo, badge, the doctor's summary and a link. */
export function DoctorSnippet({ doctor, locale }: { doctor: Doctor; locale: string }) {
  const path = entityPath({ collection: "doctors", slug: stripMarkers(doctor.slug) });

  return (
    <div className="doctor-snippet compact">
      <div className="heading-wrapper">
        <figure className="circle">
          <SiteImage media={doctor.photo} />
        </figure>
        <div className="has-label">
          {doctor.featuredLabel && (
            <div className="featured-label doctor">
              <span>{doctor.featuredLabel}</span>
            </div>
          )}
          <h4>{doctor.name}</h4>
        </div>
      </div>
      <div className="content-wrapper">
        {doctor.meta?.description && <p>{doctor.meta.description}</p>}
        {path && (
          <a className="button border small" href={withLocalePrefix(path, locale)}>
            {blogLabels(locale).meetDoctor(doctor.name)}
          </a>
        )}
      </div>
    </div>
  );
}
