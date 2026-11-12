import type { Payload } from "payload";
import { describe, expect, it, vi } from "vitest";
import { openWrittenDocCapture, takeWrittenDoc } from "../../src/core/writtenDocCapture";
import { captureCollectionWrites } from "../../src/db/captureCollectionWrites";

type Write = (args: Record<string, unknown>) => Promise<unknown>;

const stored = { id: 7, title: { en: "Title", de: "Titel" } };
const storedVersion = { id: 7, title: { en: "Draft", de: "Entwurf" } };

const request = () => ({ context: {} as Record<string, unknown> });

const adapter = (updated: unknown = stored) => {
  const error = vi.fn();
  const updateOne = vi.fn(async () => updated);
  const createVersion = vi.fn(async () => ({ id: "v", parent: 7, version: storedVersion }));
  const db: Record<string, unknown> = { updateOne, createVersion };
  captureCollectionWrites({ logger: { error } } as unknown as Payload, db);
  return {
    updateOne: (args: Record<string, unknown>) => (db.updateOne as Write)(args),
    createVersion: (args: Record<string, unknown>) => (db.createVersion as Write)(args),
    error,
  };
};

describe("captureCollectionWrites", () => {
  it("passes every write through and keeps nothing while no capture is open", async () => {
    const { updateOne } = adapter();
    const req = request();
    await expect(updateOne({ collection: "posts", id: 7, req })).resolves.toBe(stored);
    expect(takeWrittenDoc(req, "posts", 7)).toBeUndefined();
  });

  it("keeps a copy of the first document written for the open capture", async () => {
    const { updateOne, createVersion } = adapter();
    const req = request();
    openWrittenDocCapture(req, "posts", 7);
    await updateOne({ collection: "posts", where: { id: { equals: 7 } }, req });
    await createVersion({ collectionSlug: "posts", parent: 7, req });
    stored.title.de = "Geändert";
    expect(takeWrittenDoc(req, "posts", "7")).toEqual({
      id: 7,
      title: { en: "Title", de: "Titel" },
    });
    expect(takeWrittenDoc(req, "posts", 7)).toBeUndefined();
    stored.title.de = "Titel";
  });

  it("keeps the version a draft save writes", async () => {
    const { createVersion } = adapter();
    const req = request();
    openWrittenDocCapture(req, "posts", 7);
    await createVersion({ collectionSlug: "posts", parent: 7, req });
    expect(takeWrittenDoc(req, "posts", 7)).toEqual(storedVersion);
  });

  it("does not keep writes of other documents or collections", async () => {
    const { updateOne } = adapter();
    const req = request();
    openWrittenDocCapture(req, "posts", 7);
    await updateOne({ collection: "posts", id: 8, req });
    await updateOne({ collection: "pages", id: 7, req });
    expect(takeWrittenDoc(req, "posts", 7)).toBeUndefined();
  });

  it("gives a nested save of the same document its own capture", async () => {
    const { updateOne } = adapter();
    const req = request();
    openWrittenDocCapture(req, "posts", 7);
    openWrittenDocCapture(req, "posts", 7);
    await updateOne({ collection: "posts", id: 7, req });
    expect(takeWrittenDoc(req, "posts", 7)).toEqual(stored);
    expect(takeWrittenDoc(req, "posts", 7)).toBeUndefined();
  });

  it("never fails a write it cannot keep, and logs why", async () => {
    const unclonable = { ...stored, format: () => "" };
    const { updateOne, error } = adapter(unclonable);
    const req = request();
    openWrittenDocCapture(req, "posts", 7);
    await expect(updateOne({ collection: "posts", id: 7, req })).resolves.toBe(unclonable);
    expect(error).toHaveBeenCalledTimes(1);
    expect(takeWrittenDoc(req, "posts", 7)).toBeUndefined();
  });

  it("wraps an adapter once", async () => {
    const write = vi.fn(async () => stored);
    const db: Record<string, unknown> = { updateOne: write };
    const payload = { logger: { error: vi.fn() } } as unknown as Payload;
    captureCollectionWrites(payload, db);
    const wrapped = db.updateOne;
    captureCollectionWrites(payload, db);
    expect(db.updateOne).toBe(wrapped);
  });
});
