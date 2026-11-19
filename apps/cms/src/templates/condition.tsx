import React from "react";

import { RenderSiteBlocks } from "@/blocks/siteBlockComponents";
import { ConditionHero } from "@/components/site/condition/ConditionHero";
import { SymptomLinks } from "@/components/site/condition/SymptomLinks";
import { SymptomMenu } from "@/components/site/condition/SymptomMenu";
import { SitePage } from "@/components/site/layout/SitePage";
import { findEntities } from "@/dal/entities";
import type { Condition } from "@/payload-types";

import type { EntityTemplateProps } from "./types";

/**
 * The condition page: a hero listing every condition, the floating conditions menu at the top of
 * `main`, then the record's sections. The page's main heading opens its first section.
 */
export async function ConditionTemplate({
  doc,
  locale,
  path,
  header,
  footer,
}: EntityTemplateProps<Condition>) {
  const conditions = await findEntities("conditions", { locale, sort: "listOrder" });

  return (
    <SitePage
      bodyId={doc.slug}
      footer={footer}
      header={header}
      hero={<ConditionHero condition={doc} conditions={conditions} locale={locale} />}
      locale={locale}
      path={path}
      template="symptom"
    >
      <SymptomMenu heading={doc.menuHeading}>
        <SymptomLinks conditions={conditions} currentId={doc.id} locale={locale} />
      </SymptomMenu>
      <RenderSiteBlocks
        blocks={doc.blocks}
        context={{ collection: "conditions", doc }}
        locale={locale}
      />
    </SitePage>
  );
}
