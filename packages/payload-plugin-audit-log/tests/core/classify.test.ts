import { describe, expect, it } from "vitest";
import { classifyCollectionChange, classifyGlobalChange } from "../../src/core/classify";

describe("classifyCollectionChange", () => {
  it("classifies every create, including a duplicate, as doc.create", () => {
    expect(classifyCollectionChange({ operation: "create", doc: {}, flags: {} })).toBe(
      "doc.create"
    );
  });

  it("classifies switching a document's API key on or off as doc.update", () => {
    const toggle = (before: unknown, after: unknown) =>
      classifyCollectionChange({
        operation: "update",
        previousDoc: { enableAPIKey: before },
        doc: { enableAPIKey: after },
        flags: {},
      });
    expect(toggle(true, false)).toBe("doc.update");
    expect(toggle(false, true)).toBe("doc.update");
  });

  it("classifies an update as publish, unpublish, draft save or restore", () => {
    const pub = { _status: "published" };
    const draft = { _status: "draft" };
    expect(
      classifyCollectionChange({ operation: "update", previousDoc: draft, doc: pub, flags: {} })
    ).toBe("doc.publish");
    expect(
      classifyCollectionChange({ operation: "update", previousDoc: pub, doc: draft, flags: {} })
    ).toBe("doc.unpublish");
    expect(
      classifyCollectionChange({
        operation: "update",
        previousDoc: pub,
        doc: draft,
        flags: { draft: true },
      })
    ).toBe("doc.update");
    expect(
      classifyCollectionChange({
        operation: "update",
        previousDoc: pub,
        doc: pub,
        flags: { restore: true },
      })
    ).toBe("doc.restore");
    expect(
      classifyCollectionChange({ operation: "update", previousDoc: {}, doc: {}, flags: {} })
    ).toBe("doc.update");
  });

  it("classifies an unpublish when previousDoc is a newer draft of a published main doc", () => {
    const draft = { _status: "draft" };
    expect(
      classifyCollectionChange({
        operation: "update",
        previousDoc: draft,
        doc: draft,
        flags: { draft: false, wasPublished: true },
      })
    ).toBe("doc.unpublish");
    expect(
      classifyCollectionChange({
        operation: "update",
        previousDoc: draft,
        doc: draft,
        flags: { draft: false, wasPublished: false },
      })
    ).toBe("doc.update");
  });
});

describe("classifyGlobalChange", () => {
  it("classifies a newly published global as global.publish and anything else as global.update", () => {
    expect(classifyGlobalChange({ _status: "draft" }, { _status: "published" })).toBe(
      "global.publish"
    );
    expect(classifyGlobalChange({}, {})).toBe("global.update");
  });

  it("classifies a non-draft save that turns a published global into a draft as global.unpublish", () => {
    const draft = { _status: "draft" };
    const published = { _status: "published" };
    expect(classifyGlobalChange(published, draft, {})).toBe("global.unpublish");
    expect(classifyGlobalChange(draft, draft, { wasPublished: true })).toBe("global.unpublish");
    expect(classifyGlobalChange(published, draft, { draft: true })).toBe("global.update");
    expect(classifyGlobalChange(draft, draft, { wasPublished: true, restore: true })).toBe(
      "global.update"
    );
    expect(classifyGlobalChange(draft, draft, {})).toBe("global.update");
  });
});
