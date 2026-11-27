import { TranslatorError } from "../../../../core/errors/index.js";
import type { RouteKey } from "../routeKey.js";

/** Two of the plugin's own contributions claim one route; Payload would serve only one of them. */
export class DuplicateEndpointError extends TranslatorError {
  readonly mustPropagate = false;
  readonly route: RouteKey;

  constructor(route: RouteKey) {
    super(
      `payload-plugin-translator: "${route}" is registered twice by the plugin's own modules. ` +
        "Only one handler can answer a route, so list only one module that serves it."
    );
    this.route = route;
  }
}
