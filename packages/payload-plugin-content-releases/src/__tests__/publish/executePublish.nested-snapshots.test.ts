import { describe, it, expect, vi } from "vitest";
import { executePublish } from "../../publish/executePublish";

function makePayload(findByIdResult: any = {}) {
  return {
    findByID: vi.fn().mockResolvedValue(findByIdResult),
    update: vi.fn().mockResolvedValue({}),
  };
}

describe("executePublish — nested snapshot depth", () => {
  it("preserves deeply nested blocks array (form-builder-style)", async () => {
    const payload = makePayload({ id: "doc-0", updatedAt: "2026-01-01" });

    const deepSnapshot = {
      title: "Form page",
      sections: [
        {
          blockType: "form",
          fields: [
            {
              blockType: "text",
              name: "email",
              required: true,
              validation: { pattern: "^.+@.+$" },
            },
            {
              blockType: "select",
              name: "country",
              options: [
                { label: "Germany", value: "de" },
                { label: "France", value: "fr" },
              ],
            },
          ],
        },
      ],
    };

    const items = [{
      id: "item-0",
      targetCollection: "pages",
      targetDoc: "doc-0",
      action: "publish",
      snapshot: deepSnapshot,
      baseVersion: null,
    }];

    await executePublish({
      items: items as any,
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    expect(payload.update).toHaveBeenCalledTimes(1);
    const updateArg = payload.update.mock.calls[0]![0];
    expect(updateArg.data).toEqual({
      ...deepSnapshot,
      _status: "published",
    });
    expect(updateArg.data.sections[0].fields[1].options[1].value).toBe("fr");
  });

  it("preserves populated relationship objects in snapshot", async () => {
    const payload = makePayload({ id: "doc-0", updatedAt: "2026-01-01" });

    const snapshotWithRel = {
      title: "Page with refs",
      featuredMedia: { id: "media-1", filename: "hero.jpg", alt: "Hero" },
      relatedPosts: [
        { id: "post-1", title: "Post 1" },
        { id: "post-2", title: "Post 2" },
      ],
    };

    const items = [{
      id: "item-0",
      targetCollection: "pages",
      targetDoc: "doc-0",
      action: "publish",
      snapshot: snapshotWithRel,
      baseVersion: null,
    }];

    await executePublish({
      items: items as any,
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    const updateArg = payload.update.mock.calls[0]![0];
    expect(updateArg.data.featuredMedia).toEqual({
      id: "media-1",
      filename: "hero.jpg",
      alt: "Hero",
    });
    expect(updateArg.data.relatedPosts).toHaveLength(2);
    expect(updateArg.data.relatedPosts[0].id).toBe("post-1");
  });

  it("does not mutate the snapshot object passed in", async () => {
    const payload = makePayload({ id: "doc-0", updatedAt: "2026-01-01" });

    const original = {
      title: "Immutable",
      nested: { array: [{ leaf: "value" }] },
    };
    const snapshot = JSON.parse(JSON.stringify(original));

    const items = [{
      id: "item-0",
      targetCollection: "pages",
      targetDoc: "doc-0",
      action: "publish",
      snapshot,
      baseVersion: null,
    }];

    await executePublish({
      items: items as any,
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    expect(snapshot).toEqual(original);
  });

  it("captures previous state for deeply nested rollback snapshot", async () => {
    const previousState = {
      id: "doc-0",
      updatedAt: "2026-01-01",
      sections: [
        { blockType: "hero", title: "Old hero" },
        { blockType: "form", fields: [{ name: "old-field" }] },
      ],
    };
    const payload = makePayload(previousState);

    const items = [{
      id: "item-0",
      targetCollection: "pages",
      targetDoc: "doc-0",
      action: "publish",
      snapshot: { sections: [{ blockType: "hero", title: "New hero" }] },
      baseVersion: null,
    }];

    const result = await executePublish({
      items: items as any,
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    expect(result.rollbackSnapshot).toHaveLength(1);
    expect(result.rollbackSnapshot[0]!.previousState).toEqual(previousState);
    const captured = result.rollbackSnapshot[0]!.previousState as any;
    expect(captured.sections[1].fields[0].name).toBe("old-field");
  });

  it("handles unpublish without leaking snapshot fields", async () => {
    const payload = makePayload({
      id: "doc-0",
      updatedAt: "2026-01-01",
      _status: "published",
      sections: [{ blockType: "form", fields: [{ name: "foo" }] }],
    });

    const items = [{
      id: "item-0",
      targetCollection: "pages",
      targetDoc: "doc-0",
      action: "unpublish",
      snapshot: { whatever: true },
      baseVersion: null,
    }];

    await executePublish({
      items: items as any,
      payload: payload as any,
      conflictStrategy: "fail",
      batchSize: 20,
    });

    const updateArg = payload.update.mock.calls[0]![0];
    expect(updateArg.data).toEqual({ _status: "draft" });
    expect(updateArg.data.whatever).toBeUndefined();
  });
});
