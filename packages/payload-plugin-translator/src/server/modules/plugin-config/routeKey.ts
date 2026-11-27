import type { Endpoint } from "payload";

/** What tells two routes apart: Payload answers one handler per method + path. */
export type Route = Pick<Endpoint, "method" | "path">;

/** A route's method and path as one comparable string, e.g. `"post /translate/enqueue"`. */
export type RouteKey = string;

export const routeKey = (route: Route): RouteKey => `${route.method} ${route.path}`;
