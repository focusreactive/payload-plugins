import React from "react";

import { RenderSiteBlocks } from "@/blocks/siteBlockComponents";
import { SitePage } from "@/components/site/layout/SitePage";
import type { Clinic } from "@/payload-types";

import type { EntityTemplateProps } from "./types";

/** The clinic page: its top section from the record's own fields, then the record's sections. */
export function ClinicTemplate({ doc, locale, path, header, footer }: EntityTemplateProps<Clinic>) {
  return (
    <SitePage
      bodyId={doc.slug}
      footer={footer}
      header={header}
      hero={
        <section className="simple" id="hero">
          <div className="container">
            <div className="text-container">
              <h1>{doc.heroTitle || doc.name}</h1>
            </div>
          </div>
        </section>
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
    </SitePage>
  );
}
