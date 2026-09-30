import type { Payload, PayloadRequest } from "payload";

/**
 * Invoke one of the translator plugin's registered HTTP endpoints IN-PROCESS, without an HTTP layer.
 *
 * The plugin registers its routes on `payload.config.endpoints`; the handlers read only `req.payload`,
 * `req.routeParams`, and (for POSTs) `await req.json()`, and the test config passes an
 * explicit open guard — so a minimal `PayloadRequest` stub drives the real
 * handler code path. This is the faithful way to trigger a manual translation (`POST /translate/enqueue`)
 * or read staleness (`GET /translate/stale/:collection_slug/:collection_id`) from a local-API test.
 *
 * @returns the endpoint's HTTP status, and the parsed JSON body — `undefined` when the response
 * has no body (204).
 */
export async function callEndpoint(
  payload: Payload,
  method: "get" | "post",
  path: string,
  opts?: {
    routeParams?: Record<string, unknown>;
    body?: unknown;
    /** Who is calling. Omitted means an anonymous request, which is what most specs want. */
    user?: { id: string | number; collection: string } | null;
  }
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
    user: opts?.user ?? null,
  } as unknown as PayloadRequest;

  const res = await endpoint.handler(req);
  const text = await res.text();
  return { status: res.status, data: text ? JSON.parse(text) : undefined };
}
