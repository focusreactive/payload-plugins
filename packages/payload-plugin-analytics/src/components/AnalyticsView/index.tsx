import "./admin.css";

import type { AdminViewServerProps } from "payload";
import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";
import SetAnalyticsStepNav from "./SetAnalyticsStepNav";

export default function AnalyticsView({ initPageResult, params, searchParams }: AdminViewServerProps) {
  const { req, permissions, locale, visibleEntities } = initPageResult;
  const { i18n, payload, user } = req;

  const viewActions = payload.config.admin?.components?.actions;
  const title = i18n.t("analytics:title" as never);

  return (
    <DefaultTemplate
      req={req}
      i18n={i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      searchParams={searchParams}
      user={user || undefined}
      visibleEntities={visibleEntities}
      viewActions={viewActions}>
      <SetAnalyticsStepNav label={title} />

      <Gutter>
        <div className="font-body text-elev-800">
          <h1 className="text-2xl font-semibold text-elev-1000">{title}</h1>
          <p className="text-sm text-elev-500 mt-1">Coming up next…</p>
        </div>
      </Gutter>
    </DefaultTemplate>
  );
}
