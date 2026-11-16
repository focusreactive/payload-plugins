import React from "react";

import { LinkCard } from "@/blocks/site/shared/CenterTextClient";
import type { SiteBlockProps } from "@/blocks/site/types";
import { SiteButton } from "@/components/site/SiteButton";
import { SiteImage } from "@/components/site/SiteImage";
import { InlineRichText, SiteRichText, hasRichText } from "@/components/site/SiteRichText";
import { SiteSlider } from "@/components/site/SiteSlider";
import { idOf } from "@/dal/entities";
import { withLocalePrefix } from "@/lib/config/entityRoutes";
import { clinicPath, entityDocPath } from "@/lib/site/links";
import type { Clinic, Doctor, StateDoctorsBlock } from "@/payload-types";

import { findStateDoctors, stateIdOf } from "./stateData";

function stateIdFor({
  state,
  context,
}: Pick<SiteBlockProps<StateDoctorsBlock>, "state" | "context">): number | string | null {
  if (state) {
    return idOf(state);
  }

  return context?.collection === "states" ? context.doc.id : null;
}

function ClinicLinks({ clinics, locale }: { clinics: Clinic[]; locale: string }) {
  if (clinics.length === 0) {
    return null;
  }

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

interface CardProps {
  doctor: Doctor;
  clinics: Clinic[];
  href?: string;
  buttonText?: string | null;
  locale: string;
}

function DesktopCard({ doctor, clinics, href, buttonText, locale }: CardProps) {
  return (
    <LinkCard href={href}>
      <figure className="circle">
        <SiteImage media={doctor.photo} />
      </figure>
      <div className="text-container">
        <h4 className="title">{doctor.name}</h4>
        {doctor.jobTitle && <p>{doctor.jobTitle}</p>}
        {buttonText && href && (
          <a className="button border small" href={href}>
            {buttonText}
          </a>
        )}
      </div>
      <ClinicLinks clinics={clinics} locale={locale} />
    </LinkCard>
  );
}

function MobileCard({ doctor, clinics, href, locale }: CardProps) {
  return (
    <>
      <a href={href}>
        <figure className="circle">
          <SiteImage media={doctor.photo} />
        </figure>
        <h4>{doctor.name}</h4>
        {doctor.jobTitle && <p>{doctor.jobTitle}</p>}
      </a>
      <ClinicLinks clinics={clinics} locale={locale} />
    </>
  );
}

/**
 * The state page's `experts_alt`: the state's doctors as cards with the state's clinics they work
 * at, a three-card slider on larger screens and a two-card one on phones.
 */
export async function StateDoctorsComponent({
  heading,
  text,
  doctors,
  state,
  cardButtonText,
  button,
  context,
  locale,
}: SiteBlockProps<StateDoctorsBlock>) {
  const stateId = stateIdFor({ context, state });
  const doctorDocs = await findStateDoctors(doctors, stateId, locale);
  const cards = doctorDocs.map((doctor) => {
    const path = entityDocPath("doctors", doctor);
    const clinics = (doctor.clinics ?? []).filter(
      (clinic): clinic is Clinic =>
        typeof clinic === "object" &&
        clinic !== null &&
        (stateId === null || String(stateIdOf(clinic)) === String(stateId))
    );

    return {
      clinics,
      doctor,
      href: path ? withLocalePrefix(path, locale) : undefined,
    };
  });

  return (
    <section className="experts_alt mobile-slider">
      <div className="container">
        {hasRichText(heading) && (
          <h2>
            <InlineRichText data={heading} />
          </h2>
        )}
        <SiteRichText data={text} locale={locale} />
        <div>
          <div className="slider-container" id="desktop-slider">
            <SiteSlider
              className="slides hide-mobile"
              slidesToShow={{ desktop: 3, medium: 2.1, mobile: 1.1, small: 2.1 }}
              type="experts-regional"
            >
              {cards.map((card) => (
                <DesktopCard
                  buttonText={cardButtonText}
                  key={card.doctor.id}
                  locale={locale}
                  {...card}
                />
              ))}
            </SiteSlider>
            <ul className="no-slider-mobile" />
          </div>
          <SiteButton button={button} className="button hide-mobile" locale={locale} />
        </div>
        <div className="slider-container" id="mobile-slider">
          <SiteSlider
            slidesToShow={{ desktop: 2, medium: 2.1, mobile: 1.13, small: 2.1 }}
            type="experts-alt"
          >
            {cards.map((card) => (
              <MobileCard key={card.doctor.id} locale={locale} {...card} />
            ))}
          </SiteSlider>
        </div>
        <SiteButton button={button} locale={locale} />
      </div>
    </section>
  );
}
