import type { Payload, PayloadRequest } from "payload";
import { describe, expect, it, vi } from "vitest";
import { defineEndpoint } from "../../src/endpoints/defineEndpoint";

const USER = { id: 7, collection: "users" };

function makePayload(): Payload {
  return { logger: { error: vi.fn() } } as unknown as Payload;
}

function makeRequest(overrides: Partial<PayloadRequest> = {}): PayloadRequest {
  return {
    user: USER,
    payload: makePayload(),
    headers: new Headers({ cookie: "payload-tenant=1" }),
    json: async () => ({ id: 42 }),
    ...overrides,
  } as unknown as PayloadRequest;
}

describe("defineEndpoint", () => {
  it("registers a POST endpoint on the given path", () => {
    const endpoint = defineEndpoint("/comments-plugin/test", vi.fn());

    expect(endpoint.path).toBe("/comments-plugin/test");
    expect(endpoint.method).toBe("post");
  });

  it("rejects unauthenticated requests without calling the service", async () => {
    const service = vi.fn();
    const endpoint = defineEndpoint("/comments-plugin/test", service);

    const res = await endpoint.handler(makeRequest({ user: null }));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ success: false, error: "Unauthorized" });
    expect(service).not.toHaveBeenCalled();
  });

  it("passes the request payload, user, headers and body to the service", async () => {
    const service = vi.fn().mockResolvedValue({ success: true, data: { ok: true } });
    const endpoint = defineEndpoint("/comments-plugin/test", service);
    const req = makeRequest();

    const res = await endpoint.handler(req);

    expect(service).toHaveBeenCalledWith(
      { payload: req.payload, user: USER, headers: req.headers },
      { id: 42 }
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { ok: true } });
  });

  it("responds with 400 without calling the service when the body is not JSON", async () => {
    const service = vi.fn();
    const endpoint = defineEndpoint("/comments-plugin/test", service);

    const res = await endpoint.handler(
      makeRequest({ json: () => Promise.reject(new SyntaxError("Unexpected token")) })
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, error: "Invalid JSON body" });
    expect(service).not.toHaveBeenCalled();
  });

  it("responds with 400 when the service reports a failure", async () => {
    const service = vi.fn().mockResolvedValue({ success: false, error: "Not mentioned" });
    const endpoint = defineEndpoint("/comments-plugin/test", service);

    const res = await endpoint.handler(makeRequest());

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, error: "Not mentioned" });
  });

  it("responds with 500 and logs when the service throws", async () => {
    const service = vi.fn().mockRejectedValue(new Error("boom"));
    const endpoint = defineEndpoint("/comments-plugin/test", service);
    const req = makeRequest();

    const res = await endpoint.handler(req);

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ success: false, error: "boom" });
    expect(req.payload.logger.error).toHaveBeenCalled();
  });
});
