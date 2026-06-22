import "./admin.css";

import type { ComponentType } from "react";
import type { AdminViewServerProps } from "payload";
import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";
import { getFromImportMap } from "payload/shared";
import SetAnalyticsStepNav from "./SetAnalyticsStepNav";
import { AnalyticsShell } from "./AnalyticsShell";
import { getResolvedBlockRegistry, getResolvedLayout, getPluginConfig } from "../../config";
import { BUILTIN_LEAD_ACTIONS_BLOCK_IDS, BUILTIN_OVERVIEW_BLOCK_IDS } from "../../constants/layout";
import { getComponentPath } from "../../utils/path/getComponentPath";

const ANALYTICS_HEADER_LINK_PATH = getComponentPath("components/AnalyticsView/AnalyticsHeaderLink");

const BUILTIN_BLOCK_IDS = new Set<string>([
  ...BUILTIN_OVERVIEW_BLOCK_IDS,
  ...BUILTIN_LEAD_ACTIONS_BLOCK_IDS,
]);

export default function AnalyticsView({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) {
  const { req, permissions, locale, visibleEntities } = initPageResult;
  const { i18n, payload, user } = req;

  const viewActions = [...(payload.config.admin?.components?.actions ?? [])]
    .filter((action) => action !== ANALYTICS_HEADER_LINK_PATH)
    .reverse();
  const title = i18n.t("analytics:title" as never);

  const resolved = getResolvedLayout();
  const registry = getResolvedBlockRegistry();
  const abEnabled = Boolean(getPluginConfig().ab);

  const blockComponents: Record<string, ComponentType<Record<string, unknown>>> = {};
  const clientRegistry: Record<string, { hasFetch: boolean }> = {};

  for (const [id, def] of Object.entries(registry)) {
    clientRegistry[id] = { hasFetch: Boolean(def.fetch) };
    if (BUILTIN_BLOCK_IDS.has(id) || !def.component) continue;

    const resolvedComponent = getFromImportMap<ComponentType<Record<string, unknown>> | undefined>({
      importMap: payload.importMap,
      PayloadComponent: def.component,
      schemaPath: "",
      silent: true,
    });

    if (resolvedComponent) blockComponents[id] = resolvedComponent;
  }

  let SessionsTabComponent: ComponentType<Record<string, unknown>> | null = null;
  if (resolved.sessionsTabComponent) {
    SessionsTabComponent =
      getFromImportMap<ComponentType<Record<string, unknown>> | undefined>({
        importMap: payload.importMap,
        PayloadComponent: resolved.sessionsTabComponent,
        schemaPath: "",
        silent: true,
      }) ?? null;
  }

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
      viewActions={viewActions}
    >
      <SetAnalyticsStepNav label={title} />

      <Gutter>
        <AnalyticsShell
          title={title}
          layout={resolved}
          clientRegistry={clientRegistry}
          blockComponents={blockComponents}
          SessionsTabComponent={SessionsTabComponent}
          abEnabled={abEnabled}
        />
      </Gutter>
    </DefaultTemplate>
  );
}
