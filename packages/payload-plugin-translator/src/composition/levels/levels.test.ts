import { describe, it, expect, vi } from "vitest";
import type { CollectionConfig } from "payload";

import { TranslateDocumentExport } from "../../client/widgets/translate-document";
import { BulkDocumentTranslationDashboard } from "../../client/widgets/bulk-translation-dashboard/ui/BulkTranslationDashboard.export";

import { documentLevel } from "./documentLevel";
import { collectionLevel } from "./collectionLevel";
import type { CollectionAdminSlot, LevelContext } from "../../server/modules/translation-levels";

const fakeCollection = {
  slug: "posts",
  fields: [],
} as unknown as CollectionConfig;

// Pull the make() callback handed to addCollectionComponent for the given slot.
const componentFor = (ctx: LevelContext, slot: CollectionAdminSlot) => {
  const call = (ctx.addCollectionComponent as ReturnType<typeof vi.fn>).mock.calls.find(
    (c) => c[0] === slot
  );
  return call?.[1](fakeCollection);
};

// Unit-level: a level's extend() should call the expected context primitives.
// The shared route bundle + component construction are covered elsewhere; here
// we only assert the wiring (which primitive, which slot).
const makeCtx = (): LevelContext => ({
  collections: [{ slug: "posts", fields: [] } as unknown as CollectionConfig],
  basePath: "/translate",
  access: undefined,
  taskRunnerFactory: { create: vi.fn() },
  schemaMap: new Map(),
  translationProvider: { translate: vi.fn() },
  addEndpoints: vi.fn(),
  addCollectionComponent: vi.fn(),
});

describe("documentLevel", () => {
  it("contributes the document-translation bundle + a beforeDocumentControls component", () => {
    const ctx = makeCtx();

    documentLevel().extend(ctx);

    expect(ctx.addEndpoints).toHaveBeenCalledTimes(1);
    expect((ctx.addEndpoints as ReturnType<typeof vi.fn>).mock.calls[0][0]).toHaveLength(6);
    expect(ctx.addCollectionComponent).toHaveBeenCalledWith(
      "beforeDocumentControls",
      expect.any(Function)
    );
    expect(componentFor(ctx, "beforeDocumentControls")).toBeInstanceOf(TranslateDocumentExport);
  });
});

describe("collectionLevel", () => {
  it("contributes the document-translation bundle + a beforeListTable component", () => {
    const ctx = makeCtx();

    collectionLevel().extend(ctx);

    expect(ctx.addEndpoints).toHaveBeenCalledTimes(1);
    expect((ctx.addEndpoints as ReturnType<typeof vi.fn>).mock.calls[0][0]).toHaveLength(6);
    expect(ctx.addCollectionComponent).toHaveBeenCalledWith(
      "beforeListTable",
      expect.any(Function)
    );
    expect(componentFor(ctx, "beforeListTable")).toBeInstanceOf(BulkDocumentTranslationDashboard);
  });
});
