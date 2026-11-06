import { describe, expect, it, vi } from "vitest";
import {
  closeMainGlobalCapture,
  openMainGlobalCapture,
  takeCapturedMainGlobal,
} from "../../src/core/mainGlobalCapture";
import { captureMainGlobalReads } from "../../src/db/captureMainGlobalReads";

const stored = { title: "Published", _status: "published" };
const filtered = {};
const ACCESS_WHERE = { title: { equals: "visible" } };

const adapterReturning = (resultOf: (args: any) => unknown = () => stored) => {
  const findGlobal = vi.fn(async (args: any) => resultOf(args));
  const db: Record<string, unknown> = { findGlobal };
  captureMainGlobalReads(db);
  const read = (args: Record<string, unknown>) =>
    (db.findGlobal as (args: unknown) => Promise<unknown>)(args);
  return { db, findGlobal, read };
};

const request = () => ({ context: {} as Record<string, unknown> });

const latestDraft = { title: "Draft", _status: "draft" };
const LATEST_VERSION_WHERE = { and: [{}, { latest: { equals: true } }] };

const adapterWithVersions = (versionsOf: (args: any) => unknown[] = () => [latestDraft]) => {
  const findGlobalVersions = vi.fn(async (args: any) => ({
    docs: versionsOf(args).map((version) => ({ version })),
  }));
  const db: Record<string, unknown> = { findGlobal: vi.fn(async () => stored), findGlobalVersions };
  captureMainGlobalReads(db);
  const readVersions = (args: Record<string, unknown>) =>
    (db.findGlobalVersions as (args: unknown) => Promise<unknown>)(args);
  const read = (args: Record<string, unknown>) =>
    (db.findGlobal as (args: unknown) => Promise<unknown>)(args);
  return { findGlobalVersions, read, readVersions };
};

describe("captureMainGlobalReads", () => {
  it("passes every read through and keeps nothing while no capture is open", async () => {
    const { findGlobal, read } = adapterReturning();
    const req = request();
    await expect(read({ slug: "header", req })).resolves.toBe(stored);
    expect(findGlobal).toHaveBeenCalledTimes(1);
    expect(takeCapturedMainGlobal(req, "header")).toBeUndefined();
  });

  it("keeps the main global Payload reads while the capture is open, once", async () => {
    const { read } = adapterReturning();
    const req = request();
    openMainGlobalCapture(req, "header");
    await read({ slug: "header", locale: "en", req, where: undefined });
    expect(takeCapturedMainGlobal(req, "header")).toEqual({ doc: stored });
    expect(takeCapturedMainGlobal(req, "header")).toBeUndefined();
  });

  it("keeps an empty read, so a global that was never saved is told apart from one never read", async () => {
    const { read } = adapterReturning(() => null);
    const req = request();
    openMainGlobalCapture(req, "header");
    await read({ slug: "header", req });
    expect(takeCapturedMainGlobal(req, "header")).toEqual({ doc: null });
  });

  it("replaces an access-filtered read with the unfiltered one Payload makes right after it", async () => {
    const { read } = adapterReturning((args) => (args.where ? filtered : stored));
    const req = request();
    openMainGlobalCapture(req, "header");
    await read({ slug: "header", req, where: ACCESS_WHERE });
    await read({ slug: "header", req });
    expect(takeCapturedMainGlobal(req, "header")).toEqual({ doc: stored });
  });

  it("stops capturing after the unfiltered read and once the capture is closed", async () => {
    const later = { title: "Later" };
    const { read, findGlobal } = adapterReturning();
    const req = request();
    openMainGlobalCapture(req, "header");
    await read({ slug: "header", req });
    findGlobal.mockResolvedValueOnce(later);
    await read({ slug: "header", req });
    expect(takeCapturedMainGlobal(req, "header")).toEqual({ doc: stored });

    openMainGlobalCapture(req, "header");
    closeMainGlobalCapture(req, "header");
    await read({ slug: "header", req });
    expect(takeCapturedMainGlobal(req, "header")).toBeUndefined();
  });

  it("ignores reads that select fields, which is how the Local API reads a global", async () => {
    const { read } = adapterReturning();
    const req = request();
    openMainGlobalCapture(req, "header");
    await read({ slug: "header", req, select: undefined });
    await read({ slug: "header", req, select: { title: true } });
    expect(takeCapturedMainGlobal(req, "header")).toBeUndefined();
  });

  it("captures per global and per request", async () => {
    const { read } = adapterReturning();
    const req = request();
    const otherReq = request();
    openMainGlobalCapture(req, "header");
    await read({ slug: "footer", req });
    await read({ slug: "header", req: otherReq });
    await read({ slug: "header" });
    expect(takeCapturedMainGlobal(req, "footer")).toBeUndefined();
    expect(takeCapturedMainGlobal(otherReq, "header")).toBeUndefined();
  });

  it("wraps an adapter once and leaves adapters without findGlobal alone", async () => {
    const { db, findGlobal, read } = adapterReturning();
    captureMainGlobalReads(db);
    await read({ slug: "header" });
    expect(findGlobal).toHaveBeenCalledTimes(1);
    expect(() => captureMainGlobalReads({})).not.toThrow();
    expect(() => captureMainGlobalReads(undefined)).not.toThrow();
  });

  it("keeps the first latest version Payload reads before the main global, next to it", async () => {
    const { read, readVersions } = adapterWithVersions();
    const req = request();
    openMainGlobalCapture(req, "header");
    await expect(
      readVersions({ global: "header", req, limit: 1, where: LATEST_VERSION_WHERE })
    ).resolves.toEqual({ docs: [{ version: latestDraft }] });
    await readVersions({ global: "header", req, where: LATEST_VERSION_WHERE });
    await read({ slug: "header", req });
    expect(takeCapturedMainGlobal(req, "header")).toEqual({
      doc: stored,
      latestVersion: latestDraft,
    });
  });

  it("keeps no latest version when Payload finds none", async () => {
    const { read, readVersions } = adapterWithVersions(() => []);
    const req = request();
    openMainGlobalCapture(req, "header");
    await readVersions({ global: "header", req, where: LATEST_VERSION_WHERE });
    await read({ slug: "header", req });
    expect(takeCapturedMainGlobal(req, "header")).toEqual({ doc: stored });
  });

  it("ignores version reads outside the capture, of other globals or that select fields", async () => {
    const { read, readVersions, findGlobalVersions } = adapterWithVersions();
    const req = request();
    await readVersions({ global: "header", req });
    openMainGlobalCapture(req, "header");
    await readVersions({ global: "footer", req });
    await readVersions({ global: "header", req, select: { title: true } });
    await read({ slug: "header", req });
    await readVersions({ global: "header", req });
    expect(findGlobalVersions).toHaveBeenCalledTimes(4);
    expect(takeCapturedMainGlobal(req, "header")).toEqual({ doc: stored });
  });

  it("keeps the capture of an outer update while a nested update of the same global captures its own", async () => {
    const nestedStored = { title: "Nested", _status: "published" };
    const { read, findGlobal } = adapterReturning();
    const req = request();
    openMainGlobalCapture(req, "header");
    await read({ slug: "header", req });
    closeMainGlobalCapture(req, "header");

    openMainGlobalCapture(req, "header");
    findGlobal.mockResolvedValueOnce(nestedStored);
    await read({ slug: "header", req });
    closeMainGlobalCapture(req, "header");
    expect(takeCapturedMainGlobal(req, "header")).toEqual({ doc: nestedStored });

    expect(takeCapturedMainGlobal(req, "header")).toEqual({ doc: stored });
    expect(takeCapturedMainGlobal(req, "header")).toBeUndefined();
  });

  it("keeps an outer capture open while a nested update of the same global starts and ends", async () => {
    const { read } = adapterReturning();
    const req = request();
    openMainGlobalCapture(req, "header");
    openMainGlobalCapture(req, "header");
    closeMainGlobalCapture(req, "header");
    expect(takeCapturedMainGlobal(req, "header")).toBeUndefined();

    await read({ slug: "header", req });
    expect(takeCapturedMainGlobal(req, "header")).toEqual({ doc: stored });
  });
});

const writtenGlobal = { title: { en: "Saved", de: "Gespeichert" }, _status: "published" };

const adapterWithWrites = () => {
  const findGlobal = vi.fn(async () => stored);
  const updateGlobal = vi.fn(async (_args: any): Promise<unknown> => writtenGlobal);
  const createGlobal = vi.fn(async (_args: any): Promise<unknown> => writtenGlobal);
  const db: Record<string, unknown> = { findGlobal, updateGlobal, createGlobal };
  captureMainGlobalReads(db);
  const call = (method: string, args: Record<string, unknown>) =>
    (db[method] as (args: unknown) => Promise<unknown>)(args);
  return { updateGlobal, createGlobal, call };
};

describe("captureMainGlobalReads keeps the global the update writes", () => {
  it.each(["updateGlobal", "createGlobal"])(
    "keeps what %s stored once Payload has read the global and the hooks have run",
    async (method) => {
      const { call } = adapterWithWrites();
      const req = request();
      openMainGlobalCapture(req, "header");
      await call("findGlobal", { slug: "header", req });
      closeMainGlobalCapture(req, "header");
      await expect(call(method, { slug: "header", req, data: {} })).resolves.toBe(writtenGlobal);
      expect(takeCapturedMainGlobal(req, "header")).toEqual({
        doc: stored,
        written: writtenGlobal,
      });
    }
  );

  it("keeps only the first write, and none made while the capture is open, of another global or that selects fields", async () => {
    const { call, updateGlobal } = adapterWithWrites();
    const req = request();
    openMainGlobalCapture(req, "header");
    await call("findGlobal", { slug: "header", req });
    await call("updateGlobal", { slug: "header", req });
    closeMainGlobalCapture(req, "header");
    await call("updateGlobal", { slug: "footer", req });
    await call("updateGlobal", { slug: "header", req, select: { title: true } });
    updateGlobal.mockResolvedValueOnce({ title: "first" });
    await call("updateGlobal", { slug: "header", req });
    await call("updateGlobal", { slug: "header", req });
    expect(takeCapturedMainGlobal(req, "header")).toEqual({
      doc: stored,
      written: { title: "first" },
    });
  });

  it("keeps the write of a nested update of the same global apart from the outer one", async () => {
    const { call, updateGlobal } = adapterWithWrites();
    const req = request();
    openMainGlobalCapture(req, "header");
    await call("findGlobal", { slug: "header", req });
    closeMainGlobalCapture(req, "header");
    openMainGlobalCapture(req, "header");
    await call("findGlobal", { slug: "header", req });
    closeMainGlobalCapture(req, "header");
    updateGlobal.mockResolvedValueOnce({ title: "nested" });
    await call("updateGlobal", { slug: "header", req });
    expect(takeCapturedMainGlobal(req, "header")).toEqual({
      doc: stored,
      written: { title: "nested" },
    });
    await call("updateGlobal", { slug: "header", req });
    expect(takeCapturedMainGlobal(req, "header")).toEqual({ doc: stored, written: writtenGlobal });
  });
});
