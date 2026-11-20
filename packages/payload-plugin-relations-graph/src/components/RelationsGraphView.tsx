import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter, SetStepNav } from "@payloadcms/ui";
import { notFound } from "next/navigation.js";
import type { AdminViewServerProps } from "payload";

import { layoutGraph } from "../graph/layout.js";
import { getVisibleGraph } from "../lib/getVisibleGraph.js";
import { getOptions } from "../lib/options.js";
import { GraphCanvas } from "./GraphCanvas.js";

const TITLE = "Relations graph";

export const RelationsGraphView = async ({
  initPageResult,
  params,
  searchParams,
}: AdminViewServerProps) => {
  const { locale, permissions, req, visibleEntities } = initPageResult;
  const { i18n, payload, user } = req;
  const options = getOptions(payload.config);

  if (!user || !(await options.access({ req }))) {
    notFound();
  }

  const graph = getVisibleGraph(req, permissions);

  return (
    <DefaultTemplate
      i18n={i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={user}
      visibleEntities={visibleEntities}
    >
      <SetStepNav nav={[{ label: TITLE }]} />
      <Gutter>
        <GraphCanvas
          adminRoute={payload.config.routes.admin}
          apiRoute={payload.config.routes.api}
          graph={graph}
          initialPositions={layoutGraph(graph)}
          insights={options.insights}
          title={TITLE}
        />
      </Gutter>
    </DefaultTemplate>
  );
};
