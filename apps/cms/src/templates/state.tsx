import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";
import React from "react";

import { RenderSiteBlocks } from "@/blocks/siteBlockComponents";
import { SitePage } from "@/components/site/layout/SitePage";
import { StateHero } from "@/components/site/state/StateHero";
import type { State } from "@/payload-types";

import type { EntityTemplateProps } from "./types";

/** The state page: its top section from the record's own fields, then the record's sections. */
export function StateTemplate({ doc, locale, path, header, footer }: EntityTemplateProps<State>) {
  return (
    <SitePage
      bodyId={stripMarkers(doc.slug) ?? doc.slug}
      footer={footer}
      header={header}
      hero={<StateHero doc={doc} locale={locale} />}
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
