import React from "react";

import { ImageHero } from "@/blocks/site/shared/ImageHero";
import { RenderSiteBlocks } from "@/blocks/siteBlockComponents";
import { BreadcrumbsJsonLd } from "@/components/seo/components";
import { SitePage } from "@/components/site/layout/SitePage";
import { getPageBySlug } from "@/dal/getPageBySlug";
import { ENTITY_ROUTE_PREFIXES, withLocalePrefix } from "@/lib/config/entityRoutes";
import type { Treatment } from "@/payload-types";

import type { EntityTemplateProps } from "./types";

/** The trail search engines read: home, the treatments index, this treatment. */
async function TreatmentBreadcrumbs({ doc, locale, path }: EntityTemplateProps<Treatment>) {
  const indexPath = `/${ENTITY_ROUTE_PREFIXES.treatments}`;
  const indexPage = await getPageBySlug([ENTITY_ROUTE_PREFIXES.treatments], locale);

  return (
    <BreadcrumbsJsonLd
      items={[
        { label: indexPage?.title, url: withLocalePrefix(indexPath, locale) },
        { label: doc.title, url: withLocalePrefix(path, locale) },
      ]}
      locale={locale}
    />
  );
}

/** The treatment page: the `has-image` hero from the record's own fields, then its sections. */
export function TreatmentTemplate(props: EntityTemplateProps<Treatment>) {
  const { doc, locale, path, header, footer } = props;

  return (
    <SitePage
      bodyId={doc.slug}
      footer={footer}
      header={header}
      hero={
        <ImageHero
          heading={doc.heroTitle || doc.title}
          image={doc.heroImage}
          locale={locale}
          text={doc.heroIntro}
        />
      }
      locale={locale}
      path={path}
      template="treatment"
    >
      <TreatmentBreadcrumbs {...props} />
      <RenderSiteBlocks
        blocks={doc.blocks}
        context={{ collection: "treatments", doc }}
        locale={locale}
      />
    </SitePage>
  );
}
