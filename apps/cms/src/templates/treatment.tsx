import React from "react";

import { RenderSiteBlocks } from "@/blocks/siteBlockComponents";
import { SitePage } from "@/components/site/layout/SitePage";
import type { Treatment } from "@/payload-types";

import type { EntityTemplateProps } from "./types";

/** The treatment page: its top section from the record's own fields, then the record's sections. */
export function TreatmentTemplate({
  doc,
  locale,
  path,
  header,
  footer,
}: EntityTemplateProps<Treatment>) {
  return (
    <SitePage
      bodyId={doc.slug}
      footer={footer}
      header={header}
      hero={
        <section className="simple" id="hero">
          <div className="container">
            <div className="text-container">
              <h1>{doc.heroTitle || doc.title}</h1>
            </div>
          </div>
        </section>
      }
      locale={locale}
      path={path}
      template="treatment"
    >
      <RenderSiteBlocks
        blocks={doc.blocks}
        context={{ collection: "treatments", doc }}
        locale={locale}
      />
    </SitePage>
  );
}
