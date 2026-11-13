import { describe, expect, it } from "vitest";

import type { Enrichment, MarkedReadRequest } from "../../src/server/markedReads";

import { createMarkedReads } from "../../src/server/markedReads";

const requestOf = (overrides: Partial<MarkedReadRequest> = {}): MarkedReadRequest => ({
  context: {},
  pathname: "/",
  payloadAPI: "local",
  ...overrides,
});

const decisionOf = (enrichment: Enrichment = "auto", adminBasePath = "/admin") =>
  createMarkedReads({ adminBasePath, enrichment });

const isFindByIdMarked = (
  req: MarkedReadRequest,
  { draft = true, enrichment = "auto", adminBasePath = "/admin" } = {}
) =>
  decisionOf(enrichment as Enrichment, adminBasePath).isCollectionReadMarked({
    args: { draft },
    operation: "findByID",
    req,
  });

describe("a collection read", () => {
  it("is marked when it is a Local API draft read outside the admin", () => {
    expect(isFindByIdMarked(requestOf())).toBe(true);
    expect(isFindByIdMarked(requestOf({ pathname: undefined }))).toBe(true);
  });

  it("is not marked when it comes from below the admin base path", () => {
    expect(isFindByIdMarked(requestOf({ pathname: "/admin/collections/pages/2" }))).toBe(false);
    expect(
      isFindByIdMarked(requestOf({ pathname: "/cms/collections/pages/2" }), {
        adminBasePath: "/cms",
      })
    ).toBe(false);
    expect(isFindByIdMarked(requestOf({ pathname: "/cms/collections/pages/2" }))).toBe(true);
  });

  it("is not marked when it is published or comes through REST", () => {
    expect(isFindByIdMarked(requestOf(), { draft: false })).toBe(false);
    expect(isFindByIdMarked(requestOf({ payloadAPI: "REST" }))).toBe(false);
  });

  it("follows context.visualEditing in both modes, whatever the read", () => {
    const askingFor = (visualEditing: boolean) =>
      requestOf({
        context: { visualEditing },
        pathname: "/admin/collections/pages/2",
        payloadAPI: "REST",
      });

    expect(isFindByIdMarked(askingFor(true), { draft: false })).toBe(true);
    expect(isFindByIdMarked(askingFor(true), { draft: false, enrichment: "explicit" })).toBe(true);
    expect(isFindByIdMarked(requestOf({ context: { visualEditing: false } }))).toBe(false);
  });

  it("is marked only on request with explicit enrichment", () => {
    const untypedContext: Record<string, unknown> = { visualEditing: "true" };
    expect(isFindByIdMarked(requestOf(), { enrichment: "explicit" })).toBe(false);
    expect(
      isFindByIdMarked(requestOf({ context: untypedContext }), { enrichment: "explicit" })
    ).toBe(false);
  });

  it.each([
    ["find", {}, false],
    ["findVersions", { draft: true }, false],
    ["findVersionByID", { draft: true }, false],
    ["count", { draft: true }, false],
  ])("of %s with %o is marked: %s", (operation, args, isMarked) => {
    expect(decisionOf().isCollectionReadMarked({ args, operation, req: requestOf() })).toBe(
      isMarked
    );
  });

  it("marks a version read that asks for markers and never an operation that is not a read", () => {
    const req = requestOf({ context: { visualEditing: true } });

    expect(decisionOf().isCollectionReadMarked({ args: {}, operation: "findVersions", req })).toBe(
      true
    );
    expect(decisionOf().isCollectionReadMarked({ args: {}, operation: "create", req })).toBe(false);
  });
});

describe("a global read", () => {
  const SLUG = "settings";

  const readsOn = (req: MarkedReadRequest) => {
    const decision = decisionOf();
    return {
      close: (versionRead: object = {}) =>
        decision.closeGlobalRead({ req, slug: SLUG, ...versionRead }),
      open: (operation: string, args: object = {}) =>
        decision.openGlobalRead({ args, operation, req, slug: SLUG }),
    };
  };

  it("is marked when a draft read of it is the only read open", () => {
    const reads = readsOn(requestOf());
    reads.open("countVersions");
    reads.open("read", { draft: true });

    expect(reads.close()).toBe(true);
    expect(reads.close()).toBe(false);
  });

  it("is not marked while another read of it is open on the same request", () => {
    const reads = readsOn(requestOf());
    reads.open("read");
    reads.open("read", { draft: true });

    expect(reads.close()).toBe(false);
    expect(reads.close()).toBe(false);
  });

  it("counts reads per request object", () => {
    const decision = decisionOf();
    const draftRequest = requestOf();
    const otherRequest = requestOf();
    decision.openGlobalRead({
      args: { draft: true },
      operation: "read",
      req: draftRequest,
      slug: SLUG,
    });
    decision.openGlobalRead({ args: {}, operation: "read", req: otherRequest, slug: SLUG });

    expect(decision.closeGlobalRead({ req: draftRequest, slug: SLUG })).toBe(true);
  });

  it("is not marked as a version read, recognised by what Payload passes only to them", () => {
    const reads = readsOn(requestOf());
    reads.open("read", { draft: true });

    expect(reads.close({ query: {} })).toBe(false);
    expect(reads.close({ findMany: true })).toBe(false);
    expect(reads.close()).toBe(true);
  });
});
