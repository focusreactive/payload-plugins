import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";
import { redirect } from "next/navigation";
import type { AdminViewServerProps } from "payload";

import { loadSeoOverviewRows } from "./loadSeoOverviewRows";
import { SeoOverviewTable } from "./SeoOverviewTable";
import "./seoOverview.scss";

export async function SeoOverviewView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { locale, permissions, req, visibleEntities } = initPageResult;
  const { payload, user } = req;
  if (!user) redirect(`${payload.config.routes.admin}/login`);

  const localeCode = locale?.code ?? "en";
  const rows = await loadSeoOverviewRows({ locale: localeCode, req });
  const locales = payload.config.localization
    ? payload.config.localization.locales.map((option) => ({
        code: option.code,
        label: typeof option.label === "string" ? option.label : option.code,
      }))
    : [{ code: "en", label: "English" }];

  return (
    <DefaultTemplate
      i18n={req.i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={user}
      visibleEntities={visibleEntities}
    >
      <Gutter className="seo-overview">
        <header className="seo-overview__header">
          <h1>SEO overview</h1>
          <p className="seo-overview__intro">
            Every page, service, insight and person with a public address, and what search engines
            show for it. Filter to the empty ones and fix them in place. SEO fields on articles
            synced from Passle are yours to edit here: Passle never sends or overwrites them.
          </p>
        </header>
        <SeoOverviewTable
          adminRoute={payload.config.routes.admin}
          apiRoute={payload.config.routes.api}
          key={localeCode}
          locale={localeCode}
          locales={locales}
          rows={rows}
        />
      </Gutter>
    </DefaultTemplate>
  );
}
