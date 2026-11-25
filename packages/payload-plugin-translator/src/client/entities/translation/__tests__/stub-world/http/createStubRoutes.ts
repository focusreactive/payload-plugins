import type { Endpoint } from "payload";

import { withAccessCheck, withErrorHandler } from "../../../../../../server/shared/index.js";
import type { AccessGuard } from "../../../../../../server/shared/index.js";
import type { RouteHandler } from "../../../../../../server/shared/http/withErrorHandler.js";
import { ENDPOINTS } from "../../../../../../types/wire/endpoints.js";
import type { EndpointName } from "../../../../../../types/wire/endpoints.js";
import type { TranslatorAction } from "../../../../../../types/TranslatorAction.js";

import { cancel, dismissStaleness, enqueue, enqueueList, runNow } from "./actions.js";
import { readDocumentState, readListState } from "./reads.js";
import { translateField } from "./translateField.js";
import { delayed } from "./delayed.js";
import type { StubDeps } from "./StubDeps.js";

export type StubRoutesArgs = StubDeps & {
  access: AccessGuard;
  basePath: string;
  latencyMs: number;
  servesCancelAndRunNow: boolean;
};

type StubRoute = {
  name: EndpointName;
  action: TranslatorAction;
  handler: (deps: StubDeps) => RouteHandler;
};

const ALWAYS: readonly StubRoute[] = [
  { name: "documentState", action: "document-status", handler: readDocumentState },
  { name: "listState", action: "collection-status", handler: readListState },
  { name: "enqueue", action: "enqueue", handler: enqueue },
  { name: "enqueueList", action: "enqueue-list", handler: enqueueList },
  { name: "dismissStaleness", action: "dismiss-staleness", handler: dismissStaleness },
  { name: "translateField", action: "translate-field", handler: translateField },
];

const STOP_AND_RUN: readonly StubRoute[] = [
  { name: "cancel", action: "cancel", handler: cancel },
  { name: "runNow", action: "run", handler: runNow },
];

/** The guard sits outside the error handler, as on every real route. */
export function createStubRoutes({
  access,
  basePath,
  latencyMs,
  servesCancelAndRunNow,
  ...deps
}: StubRoutesArgs): Endpoint[] {
  const routes = servesCancelAndRunNow ? [...ALWAYS, ...STOP_AND_RUN] : ALWAYS;

  return routes.map(({ name, action, handler }) => ({
    method: ENDPOINTS[name].method,
    path: `${basePath}${ENDPOINTS[name].path}`,
    handler: withAccessCheck(withErrorHandler(delayed(handler(deps), latencyMs)), access, action),
  }));
}
