import type { Payload, PayloadRequest } from "payload";

/**
 * Invoke one of the translator plugin's registered HTTP endpoints IN-PROCESS, without an HTTP layer.
 *
 * The plugin registers its routes on `payload.config.endpoints`; the handlers read only `req.payload`,
 * `req.routeParams`, and (for POSTs) `await req.json()`, and the plugin's access guard defaults to
 * `undefined` (no auth wrapper) in the test config — so a minimal `PayloadRequest` stub drives the real
 * handler code path. This is the faithful way to trigger a manual translation (`POST /translate/enqueue`)
 * or read staleness (`GET /translate/stale/:collection_slug/:collection_id`) from a local-API test.
 *
 * @returns the endpoint's HTTP status + parsed JSON body.
 */
export async function callEndpoint(
  payload: Payload,
  method: "get" | "post",
  path: string,
  opts?: { routeParams?: Record<string, unknown>; body?: unknown }
): Promise<{ status: number; data: unknown }> {
  const endpoint = (payload.config.endpoints ?? []).find(
    (e) => e.method === method && e.path === path
  );
  if (!endpoint) {
    throw new Error(`No ${method.toUpperCase()} endpoint registered at "${path}"`);
  }

  const req = {
    payload,
    routeParams: opts?.routeParams ?? {},
    json: async () => opts?.body,
  } as unknown as PayloadRequest;

  const res = await endpoint.handler(req);
  const data = await res.json();
  return { status: res.status, data };
}
