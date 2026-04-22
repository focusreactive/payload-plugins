import { describe, it, expect, vi } from "vitest";
import { executeRollback } from "../../rollback/executeRollback";
import type { RollbackEntry } from "../../rollback/previewRollback";

function makePayload({ updateResult = {} as any } = {}) {
  return { update: vi.fn().mockResolvedValue(updateResult) };
}

function makeEntry(overrides: Partial<RollbackEntry> = {}): RollbackEntry {
  return {
    collection: "pages",
    docId: "doc-1",
    action: "publish",
    previousState: {
      id: "doc-1",
      title: "Old Title",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-05",
      _status: "published",
    },
    ...overrides,
  };
}

describe("executeRollback", () => {
  it("all succeed → restored list populated, failed empty", async () => {
    const payload = makePayload();
    const entry = makeEntry();

    const result = await executeRollback({ eligible: [entry], payload: payload as any });

    expect(result.restored).toHaveLength(1);
    expect(result.restored[0]).toEqual({ collection: "pages", docId: "doc-1" });
    expect(result.failed).toHaveLength(0);
  });

  it("previousState === null → entry in failed with correct error, loop continues for other entries", async () => {
    const payload = makePayload();
    const nullEntry = makeEntry({ docId: "doc-null", previousState: null });
    const goodEntry = makeEntry({ docId: "doc-good" });

    const result = await executeRollback({
      eligible: [nullEntry, goodEntry],
      payload: payload as any,
    });

    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.docId).toBe("doc-null");
    expect(result.failed[0]!.error).toBe("No previous state to restore");

    // Loop continued: good entry was still processed
    expect(result.restored).toHaveLength(1);
    expect(result.restored[0]!.docId).toBe("doc-good");
  });

  it("payload.update throws → entry in failed, loop continues for other entries", async () => {
    const payload = makePayload();
    payload.update
      .mockRejectedValueOnce(new Error("DB error"))
      .mockResolvedValue({});

    const failEntry = makeEntry({ docId: "doc-fail" });
    const goodEntry = makeEntry({ docId: "doc-good" });

    const result = await executeRollback({
      eligible: [failEntry, goodEntry],
      payload: payload as any,
    });

    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]!.docId).toBe("doc-fail");
    expect(result.failed[0]!.error).toBe("DB error");

    // Loop continued: second entry still processed
    expect(result.restored).toHaveLength(1);
    expect(result.restored[0]!.docId).toBe("doc-good");
  });

  it("strips id, createdAt, updatedAt before calling payload.update", async () => {
    const payload = makePayload();
    const entry = makeEntry();

    await executeRollback({ eligible: [entry], payload: payload as any });

    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ id: expect.anything() }),
      }),
    );
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ createdAt: expect.anything() }),
      }),
    );
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({ updatedAt: expect.anything() }),
      }),
    );
    // Verify remaining fields are still passed
    expect(payload.update).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "pages",
        id: "doc-1",
        data: expect.objectContaining({ title: "Old Title", _status: "published" }),
      }),
    );
  });
});
