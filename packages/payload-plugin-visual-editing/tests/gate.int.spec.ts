import type { PayloadRequest } from "payload";

import { describe, expect, it } from "vitest";

import { DRAFT_CONTEXT_KEY } from "../src/internal/beforeOperationHook";
import { shouldEnrich } from "../src/internal/gate";

const makeReq = (overrides: Partial<PayloadRequest>): PayloadRequest =>
  ({
    context: { [DRAFT_CONTEXT_KEY]: true },
    payloadAPI: "local",
    pathname: "/",
    ...overrides,
  }) as unknown as PayloadRequest;

describe("shouldEnrich", () => {
  it('enriches a frontend draft local read (pathname "/")', () => {
    expect(shouldEnrich(makeReq({ pathname: "/" }), "/admin")).toBe(true);
  });

  it("skips an admin edit-view read (pathname under admin base path)", () => {
    expect(shouldEnrich(makeReq({ pathname: "/admin/collections/pages/2" }), "/admin")).toBe(false);
  });

  it("respects a custom adminBasePath", () => {
    expect(shouldEnrich(makeReq({ pathname: "/cms/collections/pages/2" }), "/cms")).toBe(false);
    // the same read is enriched when the admin base path differs
    expect(shouldEnrich(makeReq({ pathname: "/cms/collections/pages/2" }), "/admin")).toBe(true);
  });

  it("context.visualEditing=true override wins even for an admin read", () => {
    const req = makeReq({
      pathname: "/admin/collections/pages/2",
      context: { [DRAFT_CONTEXT_KEY]: true, visualEditing: true } as PayloadRequest["context"],
    });
    expect(shouldEnrich(req, "/admin")).toBe(true);
  });

  it("context.visualEditing=false override wins even for a frontend read", () => {
    const req = makeReq({
      pathname: "/",
      context: { [DRAFT_CONTEXT_KEY]: true, visualEditing: false } as PayloadRequest["context"],
    });
    expect(shouldEnrich(req, "/admin")).toBe(false);
  });

  it("skips non-draft reads", () => {
    const req = makeReq({
      context: { [DRAFT_CONTEXT_KEY]: false } as PayloadRequest["context"],
    });
    expect(shouldEnrich(req, "/admin")).toBe(false);
  });

  it("skips REST reads", () => {
    expect(shouldEnrich(makeReq({ payloadAPI: "REST" }), "/admin")).toBe(false);
  });

  it("treats a missing pathname as the root (frontend) read", () => {
    expect(shouldEnrich(makeReq({ pathname: undefined }), "/admin")).toBe(true);
  });
});

describe("shouldEnrich — explicit enrichment", () => {
  const withContext = (context: Record<string, unknown>, overrides: Partial<PayloadRequest> = {}) =>
    makeReq({ ...overrides, context: context as PayloadRequest["context"] });

  it("skips a frontend draft local read without the visualEditing signal", () => {
    expect(shouldEnrich(makeReq({ pathname: "/" }), "/admin", "explicit")).toBe(false);
  });

  it("enriches when context.visualEditing=true", () => {
    const req = withContext({ [DRAFT_CONTEXT_KEY]: true, visualEditing: true });
    expect(shouldEnrich(req, "/admin", "explicit")).toBe(true);
  });

  it("enriches on the signal alone, regardless of draft, API or pathname", () => {
    const req = withContext(
      { [DRAFT_CONTEXT_KEY]: false, visualEditing: true },
      { payloadAPI: "REST", pathname: "/admin/collections/pages/2" }
    );
    expect(shouldEnrich(req, "/admin", "explicit")).toBe(true);
  });

  it("skips when context.visualEditing=false", () => {
    const req = withContext({ [DRAFT_CONTEXT_KEY]: true, visualEditing: false });
    expect(shouldEnrich(req, "/admin", "explicit")).toBe(false);
  });

  it("ignores a non-boolean visualEditing value", () => {
    const req = withContext({ [DRAFT_CONTEXT_KEY]: true, visualEditing: "true" });
    expect(shouldEnrich(req, "/admin", "explicit")).toBe(false);
  });
});

describe("shouldEnrich — auto enrichment", () => {
  it("is the default mode", () => {
    const req = makeReq({ pathname: "/" });
    expect(shouldEnrich(req, "/admin", "auto")).toBe(shouldEnrich(req, "/admin"));
  });
});
