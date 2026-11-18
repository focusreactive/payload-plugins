import { ENDPOINTS } from "../../../types/wire/endpoints.js";
import type { EndpointName } from "../../../types/wire/endpoints.js";
import type { Abilities } from "../../../types/wire/TranslateKitConfig.js";

import { routeKey } from "./routeKey.js";
import type { Route } from "./routeKey.js";

/** Read off the routes that registered, so the admin cannot offer a control the server cannot serve. */
export function deriveAbilities(registered: readonly Route[], basePath: string): Abilities {
  const keys = new Set(registered.map(routeKey));
  const has = (name: EndpointName): boolean => {
    const { method, path } = ENDPOINTS[name];
    return keys.has(routeKey({ method, path: `${basePath}${path}` }));
  };

  return {
    translate: has("enqueue"),
    cancel: has("cancel"),
    runNow: has("runNow"),
    staleness: has("dismissStaleness"),
    translateField: has("translateField"),
  };
}
