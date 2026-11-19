import React from "react";

import { RenderSiteBlocks } from "@/blocks/siteBlockComponents";
import { JsonLd } from "@/components/seo/components";
import { DoctorHero } from "@/components/site/doctor/DoctorHero";
import { doctorSchema } from "@/components/site/doctor/doctorSchema";
import { SitePage } from "@/components/site/layout/SitePage";
import { getServerSideURL } from "@/lib/utils/getURL";
import type { Doctor } from "@/payload-types";

import type { EntityTemplateProps } from "./types";

/** The doctor page: its top section and structured data from the record, then its sections. */
export function DoctorTemplate({ doc, locale, path, header, footer }: EntityTemplateProps<Doctor>) {
  return (
    <SitePage
      bodyId={doc.slug}
      footer={footer}
      header={header}
      hero={<DoctorHero doctor={doc} locale={locale} />}
      locale={locale}
      path={path}
      template="doctor"
    >
      <JsonLd
        data={doctorSchema({
          baseUrl: getServerSideURL(),
          doctor: doc,
          locale,
          path,
          siteName: header?.name,
          sitePhone: header?.phone,
        })}
      />
      <RenderSiteBlocks
        blocks={doc.blocks}
        context={{ collection: "doctors", doc }}
        locale={locale}
      />
    </SitePage>
  );
}
