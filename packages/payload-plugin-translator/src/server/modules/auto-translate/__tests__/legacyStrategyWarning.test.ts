import { afterEach, describe, expect, it, vi } from "vitest";

import { AUTO_TRANSLATE_CUSTOM_KEY } from "../../../../core/domain/auto-translate/index.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import type { TaskRunnerFactory } from "../../task-runner/index.js";
import { configureAutoTranslate } from "../AutoTranslate.wiring.js";
import { storeDouble } from "../../runs/__tests__/fixtures/runRecordStore.js";

const runner = { create: vi.fn() } as unknown as TaskRunnerFactory;
const schemaMap = new Map() as CollectionSchemaMap;

const collection = (custom: Record<string, unknown>) => [{ slug: "posts", custom }];

afterEach(() => {
  vi.restoreAllMocks();
});

describe("a collection still carrying the removed auto-translate option", () => {
  it("is warned about at boot, rather than quietly translating the whole document", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    configureAutoTranslate(
      collection({ [AUTO_TRANSLATE_CUSTOM_KEY]: { targets: ["de"], strategy: "skip_existing" } }),
      schemaMap,
      runner,
      () => storeDouble()
    );

    expect(warn).toHaveBeenCalledWith(expect.stringContaining("`strategy` was removed"));
  });

  it("is left alone when it carries no such option", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    configureAutoTranslate(
      collection({ [AUTO_TRANSLATE_CUSTOM_KEY]: { targets: ["de"] } }),
      schemaMap,
      runner,
      () => storeDouble()
    );

    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining("`strategy` was removed"));
  });
});
