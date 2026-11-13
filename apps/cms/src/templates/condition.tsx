import React from "react";

import { RenderSiteBlocks } from "@/blocks/siteBlockComponents";
import { SitePage } from "@/components/site/layout/SitePage";
import type { Condition } from "@/payload-types";

import type { EntityTemplateProps } from "./types";

/** The condition page: its top section from the record's own fields, then the record's sections. */
export function ConditionTemplate({
  doc,
  locale,
  path,
  header,
  footer,
}: EntityTemplateProps<Condition>) {
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
      template="symptom"
    >
      <RenderSiteBlocks
        blocks={doc.blocks}
        context={{ collection: "conditions", doc }}
        locale={locale}
      />
    </SitePage>
  );
}
