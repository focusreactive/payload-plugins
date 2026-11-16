import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";
import React from "react";

import { ImageHero } from "@/blocks/site/shared/ImageHero";
import type { ImageHeroCrumb } from "@/blocks/site/shared/ImageHero";
import { RenderSiteBlocks } from "@/blocks/siteBlockComponents";
import { ClinicJsonLd } from "@/components/site/clinic/ClinicJsonLd";
import { clinicAddressLines } from "@/components/site/clinic/clinicData";
import { SitePage } from "@/components/site/layout/SitePage";
import { getPageBySlug } from "@/dal/getPageBySlug";
import { ENTITY_ROUTE_PREFIXES } from "@/lib/config/entityRoutes";
import type { Clinic } from "@/payload-types";

import type { EntityTemplateProps } from "./types";

/** Locations index / state / clinic, from the route: the trail is never typed in the CMS. */
function clinicCrumbs(doc: Clinic, locationsTitle: string | null | undefined): ImageHeroCrumb[] {
  const state = typeof doc.state === "object" ? doc.state : null;
  const crumbs: ImageHeroCrumb[] = [
    {
      link: { kind: "relative", path: `/${ENTITY_ROUTE_PREFIXES.locations}` },
      text: locationsTitle,
    },
  ];

  if (state) {
    crumbs.push({
      link: { kind: "internal", page: { relationTo: "states", value: state } },
      text: state.name,
    });
  }

  crumbs.push({ text: doc.name });

  return crumbs;
}

/** The clinic page: its top section from the record's own fields, then the record's sections. */
export async function ClinicTemplate({
  doc,
  locale,
  path,
  header,
  footer,
}: EntityTemplateProps<Clinic>) {
  const locationsPage = await getPageBySlug([ENTITY_ROUTE_PREFIXES.locations], locale);

  return (
    <SitePage
      bodyId={stripMarkers(doc.slug) ?? doc.slug}
      footer={footer}
      header={header}
      hero={
        <ImageHero
          address={clinicAddressLines(doc).join("\n")}
          button={doc.hero?.button}
          crumbs={clinicCrumbs(doc, locationsPage?.title)}
          heading={doc.heroTitle || doc.name}
          image={doc.photo}
          locale={locale}
          mobileImage={doc.photo}
          phone={doc.phone}
          phoneLabel={doc.hero?.phoneLabel}
          subheading={doc.heroSubtitle}
        />
      }
      locale={locale}
      path={path}
      template="location"
    >
      <RenderSiteBlocks
        blocks={doc.blocks}
        context={{ collection: "clinics", doc }}
        locale={locale}
      />
      <ClinicJsonLd clinic={doc} locale={locale} organizationName={header?.name} path={path} />
    </SitePage>
  );
}
