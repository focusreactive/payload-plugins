import type { PayloadRequest } from "payload";

interface MakeReqArgs {
  user?: unknown;
  body?: unknown;
  params?: Record<string, string>;
  routeParams?: Record<string, string>;
}
export function makePayloadRequest({
  user,
  body,
  params,
  routeParams,
}: MakeReqArgs = {}): PayloadRequest {
  const route = routeParams ?? params ?? {};

  return {
    user: user ?? null,
    json: async () => body,
    params: route,
    routeParams: route,
    payload: {} as PayloadRequest["payload"],
  } as unknown as PayloadRequest;
}
