import { describe, expect, it } from "vitest";
import { classifyCollectionChange, classifyGlobalChange } from "../../src/core/classify";

describe("classifyCollectionChange", () => {
  it("classifies a create as doc.create, doc.duplicate or apikey.created", () => {
    expect(classifyCollectionChange({ operation: "create", doc: {}, flags: {} })).toBe(
      "doc.create"
    );
    expect(
      classifyCollectionChange({
        operation: "create",
        doc: {},
        flags: { duplicate: true, duplicateFrom: "1" },
      })
    ).toBe("doc.duplicate");
    expect(
      classifyCollectionChange({ operation: "create", doc: {}, flags: { duplicate: true } })
    ).toBe("doc.duplicate");
    expect(
      classifyCollectionChange({
        operation: "create",
        doc: {},
        flags: {},
        isApiKeyCollection: true,
      })
    ).toBe("apikey.created");
  });

  it("classifies switching off a document's API key as apikey.revoked", () => {
    const revoke = (usesApiKeys: boolean, before: unknown, after: unknown) =>
      classifyCollectionChange({
        operation: "update",
        previousDoc: { enableAPIKey: before },
        doc: { enableAPIKey: after },
        flags: {},
        usesApiKeys,
      });
    expect(revoke(true, true, false)).toBe("apikey.revoked");
    expect(revoke(true, false, false)).toBe("doc.update");
    expect(revoke(false, true, false)).toBe("doc.update");
  });

  it("classifies switching on a document's API key as apikey.created", () => {
    const enable = (usesApiKeys: boolean, before: unknown, after: unknown) =>
      classifyCollectionChange({
        operation: "update",
        previousDoc: { enableAPIKey: before },
        doc: { enableAPIKey: after },
        flags: {},
        usesApiKeys,
      });
    expect(enable(true, false, true)).toBe("apikey.created");
    expect(enable(true, null, true)).toBe("apikey.created");
    expect(enable(true, true, true)).toBe("doc.update");
    expect(enable(false, false, true)).toBe("doc.update");
  });

  it("does not classify a draft save as an API key change", () => {
    const draftSave = (before: unknown, after: unknown) =>
      classifyCollectionChange({
        operation: "update",
        previousDoc: { enableAPIKey: before, _status: "published" },
        doc: { enableAPIKey: after, _status: "draft" },
        flags: { draft: true },
        usesApiKeys: true,
        savesDraft: true,
      });
    expect(draftSave(false, true)).toBe("doc.update");
    expect(draftSave(true, false)).toBe("doc.update");
  });

  it("classifies a publish as an API key change against the document that was live before it", () => {
    const publish = (live: unknown, latestDraft: unknown, after: unknown) =>
      classifyCollectionChange({
        operation: "update",
        previousDoc: { enableAPIKey: latestDraft, _status: "draft" },
        liveDoc: { enableAPIKey: live, _status: "published" },
        doc: { enableAPIKey: after, _status: "published" },
        flags: {},
        usesApiKeys: true,
      });
    expect(publish(false, true, true)).toBe("apikey.created");
    expect(publish(true, false, false)).toBe("apikey.revoked");
    expect(publish(true, true, true)).toBe("doc.publish");
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
