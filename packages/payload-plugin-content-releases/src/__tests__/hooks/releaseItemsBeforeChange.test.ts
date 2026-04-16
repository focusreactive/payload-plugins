import { describe, it, expect, vi } from "vitest";
import { buildReleaseItemsBeforeChange } from "../../hooks/releaseItemsBeforeChange";

function makePayload(releaseStatus: string, existingItems: any[] = []) {
  return {
    findByID: vi.fn().mockResolvedValue({ status: releaseStatus }),
    find: vi.fn().mockResolvedValue({ docs: existingItems }),
  };
}

function makeArgs(
  data: Record<string, any>,
  payload: any,
  operation: "create" | "update" = "create",
  originalDoc?: Record<string, any>,
) {
  return {
    data,
    originalDoc,
    operation,
    req: { payload },
    collection: {} as any,
    context: {} as any,
  };
}

describe("releaseItemsBeforeChange", () => {
  const hook = buildReleaseItemsBeforeChange();

  it("should allow adding items to a draft release", async () => {
    const payload = makePayload("draft");
    const data = {
      release: "rel-1",
      targetCollection: "pages",
      targetDoc: "doc-1",
      snapshot: { title: "Hello" },
    };
    const result = await hook(makeArgs(data, payload) as any);
    expect(result).toEqual(data);
  });

  it("should allow adding items to a scheduled release", async () => {
    const payload = makePayload("scheduled");
    const data = {
      release: "rel-1",
      targetCollection: "pages",
      targetDoc: "doc-1",
      snapshot: { title: "Hello" },
    };
    const result = await hook(makeArgs(data, payload) as any);
    expect(result).toEqual(data);
  });

  it("should reject adding items to a published release", async () => {
    const payload = makePayload("published");
    const data = { release: "rel-1", targetCollection: "pages", targetDoc: "doc-1" };
    await expect(
      hook(makeArgs(data, payload) as any),
    ).rejects.toThrow(/can only be modified/i);
  });

  it("should reject duplicate doc in same release on create", async () => {
    const existing = [{ id: "item-99", targetCollection: "pages", targetDoc: "doc-1" }];
    const payload = makePayload("draft", existing);
    const data = {
      release: "rel-1",
      targetCollection: "pages",
      targetDoc: "doc-1",
    };
    await expect(
      hook(makeArgs(data, payload) as any),
    ).rejects.toThrow(/already exists in this release/i);
  });

  it("should allow status-only updates when release is publishing", async () => {
    const payload = makePayload("publishing", []);
    const data = {
      release: "rel-1",
      status: "published",
    };
    const result = await hook(
      makeArgs(data, payload, "update", { id: "item-1", status: "pending" }) as any,
    );
    expect(result.status).toBe("published");
  });

  it("should reject content updates when release is publishing", async () => {
    const payload = makePayload("publishing", []);
    const data = {
      release: "rel-1",
      targetCollection: "pages",
      targetDoc: "doc-1",
      snapshot: { title: "Sneaky edit" },
    };
    await expect(
      hook(makeArgs(data, payload, "update", { id: "item-1" }) as any),
    ).rejects.toThrow(/can only be modified/i);
  });

  it("should allow updates to existing items in draft releases", async () => {
    const payload = makePayload("draft", []);
    const data = {
      release: "rel-1",
      targetCollection: "pages",
      targetDoc: "doc-1",
      snapshot: { title: "Updated" },
    };
    const result = await hook(
      makeArgs(data, payload, "update", { id: "item-1" }) as any,
    );
    expect(result.snapshot.title).toBe("Updated");
  });
});
