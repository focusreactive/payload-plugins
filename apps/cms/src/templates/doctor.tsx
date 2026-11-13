import React from "react";

import { RenderSiteBlocks } from "@/blocks/siteBlockComponents";
import { SitePage } from "@/components/site/layout/SitePage";
import type { Doctor } from "@/payload-types";

import type { EntityTemplateProps } from "./types";

/** The doctor page: its top section from the record's own fields, then the record's sections. */
export function DoctorTemplate({ doc, locale, path, header, footer }: EntityTemplateProps<Doctor>) {
  return (
    <SitePage
      bodyId={doc.slug}
      footer={footer}
      header={header}
      hero={
        <section className="simple" id="hero">
          <div className="container">
            <div className="text-container">
              <h1>{doc.name}</h1>
            </div>
          </div>
        </section>
      }
      locale={locale}
      path={path}
      template="doctor"
    >
      <RenderSiteBlocks
        blocks={doc.blocks}
        context={{ collection: "doctors", doc }}
        locale={locale}
      />
    </SitePage>
  );
}
