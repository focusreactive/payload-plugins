import type { Endpoint, PayloadRequest } from "payload";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WorkflowError } from "../src/engine/errors.js";
import type { WorkflowErrorCode } from "../src/engine/errors.js";

const calls = vi.hoisted(() => ({ next: null as unknown, args: [] as unknown[] }));

const fake = (name: string) => async (_payload: unknown, args: unknown) => {
  calls.args.push({ name, args });
  if (calls.next instanceof Error) {
    throw calls.next;
  }
  return calls.next ?? { ok: name };
};

vi.mock("../src/server/operations.js", () => ({
  startWorkflow: fake("start"),
  fireWorkflowAction: fake("fire"),
  abortWorkflow: fake("abort"),
}));
vi.mock("../src/server/queries.js", () => ({
  getWorkflowState: fake("state"),
  listWorkflowInstances: fake("instances"),
  listWorkflowDefinitions: () => ({ definitions: [] }),
}));

const { statusOf, workflowEndpoints } = await import("../src/endpoints.js");

const logger = { error: vi.fn() };

const req = (over: { url?: string; body?: unknown; user?: unknown } = {}) =>
  ({
    url: over.url ?? "http://localhost/api/workflows/x",
    user: over.user === undefined ? { id: 7, collection: "users" } : over.user,
    json: async () => over.body ?? {},
    payload: { logger },
  }) as unknown as PayloadRequest;

const endpoint = (method: string, path: string): Endpoint => {
  const found = workflowEndpoints().find(
    (e) => e.method === method && e.path === `/workflows/${path}`
  );
  if (!found) {
    throw new Error(`no ${method} ${path}`);
  }
  return found;
};

const call = async (method: string, path: string, request: PayloadRequest) => {
  const response = await endpoint(method, path).handler(request);
  return { status: response.status, body: await response.json(), headers: response.headers };
};

beforeEach(() => {
  calls.next = null;
  calls.args = [];
  logger.error.mockClear();
});

describe("workflow endpoints", () => {
  it("401 without a user", async () => {
    const result = await call("post", "fire", req({ user: null }));
    expect(result.status).toBe(401);
    expect(result.body).toEqual({ errors: [{ message: "You must be logged in." }] });
    expect(calls.args).toEqual([]);
  });

  it("passes parsed input through and answers no-store JSON", async () => {
    const result = await call(
      "post",
      "fire",
      req({
        body: { instanceId: 5, activity: "review", action: "reject", params: { reason: "x" } },
      })
    );
    expect(result.status).toBe(200);
    expect(result.headers.get("Cache-Control")).toBe("no-store");
    expect(result.body).toEqual({ ok: "fire" });
    expect(calls.args[0]).toMatchObject({
      name: "fire",
      args: {
        instanceId: "5",
        activity: "review",
        action: "reject",
        params: { reason: "x" },
        via: "admin",
      },
    });
  });

  it("marks API-key callers as api", async () => {
    await call(
      "post",
      "start",
      req({
        body: { workflow: "w", collection: "pages", id: "1" },
        user: { id: 1, _strategy: "api-key" },
      })
    );
    expect(calls.args[0]).toMatchObject({
      args: { via: "api", workflow: "w", collection: "pages", id: "1" },
    });
  });

  it("400 when required input is missing", async () => {
    expect((await call("post", "start", req({ body: { workflow: "w" } }))).status).toBe(400);
    expect((await call("post", "fire", req({ body: {} }))).status).toBe(400);
    expect((await call("post", "abort", req({ body: {} }))).status).toBe(400);
    expect(
      (await call("get", "state", req({ url: "http://x/api/workflows/state?collection=pages" })))
        .status
    ).toBe(400);
  });

  it("parses the instances query", async () => {
    await call(
      "get",
      "instances",
      req({ url: "http://x/?scope=all&workflow=w&status=active&page=2&limit=5" })
    );
    expect(calls.args[0]).toMatchObject({
      args: { scope: "all", workflow: "w", status: "active", page: 2, limit: 5 },
    });
    calls.args = [];
    await call("get", "instances", req({ url: "http://x/?status=bogus&page=x" }));
    expect(calls.args[0]).toMatchObject({
      args: { scope: "mine", status: undefined, page: 1, limit: 20 },
    });
  });

  it.each<[WorkflowErrorCode, number]>([
    ["not-allowed", 403],
    ["conflict", 409],
    ["already-running", 409],
    ["unknown-workflow", 404],
    ["unknown-instance", 404],
    ["unknown-subject", 404],
    ["unknown-stage", 404],
    ["unknown-activity", 404],
    ["unknown-action", 404],
    ["invalid-params", 400],
    ["invalid-patch", 400],
    ["unauthorized", 401],
    ["instance-not-active", 409],
    ["activity-not-active", 409],
    ["not-callable", 409],
    ["cascade-limit", 500],
    ["condition-error", 500],
  ])("maps %s to %i in Payload's error shape", async (code, status) => {
    calls.next = new WorkflowError(code, `msg ${code}`);
    const result = await call("post", "abort", req({ body: { instanceId: "1" } }));
    expect(result.status).toBe(status);
    expect(statusOf(code)).toBe(status);
    expect(result.body).toEqual({ errors: [{ message: `msg ${code}`, code }] });
    expect(logger.error).toHaveBeenCalledTimes(status === 500 ? 1 : 0);
  });

  it("keeps a Payload 4xx and hides anything else behind a logged 500", async () => {
    calls.next = Object.assign(new Error("Forbidden"), { status: 403 });
    expect(
      (await call("get", "state", req({ url: "http://x/?collection=pages&id=1" }))).status
    ).toBe(403);
    calls.next = new Error("db exploded");
    const result = await call("get", "state", req({ url: "http://x/?collection=pages&id=1" }));
    expect(result.status).toBe(500);
    expect(result.body).toEqual({
      errors: [{ message: "Something went wrong running the workflow." }],
    });
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it("lists definitions", async () => {
    expect((await call("get", "definitions", req())).body).toEqual({ definitions: [] });
  });
});
