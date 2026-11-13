import React from "react";

import { RenderSiteBlocks } from "@/blocks/siteBlockComponents";
import { SitePage } from "@/components/site/layout/SitePage";
import type { State } from "@/payload-types";

import type { EntityTemplateProps } from "./types";

/** The state page: its top section from the record's own fields, then the record's sections. */
export function StateTemplate({ doc, locale, path, header, footer }: EntityTemplateProps<State>) {
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
      template="region"
    >
      <RenderSiteBlocks
        blocks={doc.blocks}
        context={{ collection: "states", doc }}
        locale={locale}
      />
    </SitePage>
  );
}
