import { describe, it, expect, vi } from "vitest";
import type { CollectionSlug, Field } from "payload";

import type { CollectionSchemaMap } from "../../features/translate-document";

import { fieldLevel } from "./fieldLevel";
import type { LevelContext } from "./types";

// Unit-level: assert which context primitives the level calls. The endpoint's
// path / method / basePath / access wiring is covered by createFieldRoute's own
// contract test (route.test.ts), so we don't re-assert it here.
const makeCtx = (): LevelContext => ({
  collections: [],
  basePath: "/translate",
  access: undefined,
  taskRunnerFactory: { create: vi.fn() },
  schemaMap: new Map([
    ["posts" as CollectionSlug, [{ name: "title", type: "text" }] as Field[]],
  ]) as CollectionSchemaMap,
  translationProvider: { translate: vi.fn() },
  addEndpoints: vi.fn(),
  addCollectionComponent: vi.fn(),
});

describe("fieldLevel", () => {
  it("contributes the single field-translation endpoint and no collection component", () => {
    const ctx = makeCtx();
    fieldLevel().extend(ctx);

    expect(ctx.addEndpoints).toHaveBeenCalledTimes(1);
    const [endpoints] = (ctx.addEndpoints as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0].path).toBe("/translate/field"); // the field route, not the doc bundle
    expect(ctx.addCollectionComponent).not.toHaveBeenCalled();
  });
});
