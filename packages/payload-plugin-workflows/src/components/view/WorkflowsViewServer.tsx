import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter } from "@payloadcms/ui";
import { redirect } from "next/navigation.js";
import type { AdminViewServerProps } from "payload";
import { formatAdminURL } from "payload/shared";

import type { WorkflowsClientProps } from "../shared/types.js";
import { WorkflowsView } from "./WorkflowsView.js";

/**
 * `/admin/workflows`. Payload renders a custom view without the admin chrome, so this server
 * component wraps the client view in the default template (nav + header), like Payload's own views.
 */
export const WorkflowsViewServer = ({
  initPageResult,
  params,
  searchParams,
  endpoints,
  instancesSlug,
  viewPath,
}: AdminViewServerProps & Partial<WorkflowsClientProps>) => {
  const { req, permissions, locale, visibleEntities } = initPageResult;
  const { i18n, payload, user } = req;
  const adminRoute = payload.config.routes.admin;
  if (!user) {
    // Custom views are public to Payload; this one is not.
    const back = formatAdminURL({ adminRoute, path: (viewPath ?? "/workflows") as `/${string}` });
    redirect(
      `${formatAdminURL({ adminRoute, path: "/login" })}?redirect=${encodeURIComponent(back)}`
    );
  }
  const client = (payload.config.admin?.custom?.workflows ?? {}) as Partial<WorkflowsClientProps>;
  return (
    <DefaultTemplate
      i18n={i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={user ?? undefined}
      viewActions={payload.config.admin?.components?.actions ?? []}
      visibleEntities={visibleEntities}
    >
      <Gutter>
        <WorkflowsView
          endpoints={endpoints ?? client.endpoints}
          instancesSlug={instancesSlug ?? client.instancesSlug}
          viewPath={viewPath ?? client.viewPath}
        />
      </Gutter>
    </DefaultTemplate>
  );
};
