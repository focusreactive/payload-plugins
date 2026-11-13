import type { Config } from "payload";

import type { VisualEditingPluginConfig } from "../../src/index";

import { visualEditingPlugin } from "../../src/index";

type Hook = (args: object) => unknown;

const lastHookOf = (hooks: unknown[] | undefined) => hooks?.at(-1) as Hook;

export type Localization = false | { localeCodes: string[] };

export const draftReadRequest = (
  baseConfig: Config,
  { locale, localization }: { locale?: string; localization?: Localization } = {}
) => ({
  context: { visualEditing: true },
  locale,
  payload: {
    blocks: {},
    collections: Object.fromEntries(
      (baseConfig.collections ?? []).map((collection) => [collection.slug, { config: collection }])
    ),
    config: { globals: baseConfig.globals, localization },
  },
});

type DraftReadRequest = ReturnType<typeof draftReadRequest>;

export const readThroughPlugin = (baseConfig: Config, options?: VisualEditingPluginConfig) => {
  const config = visualEditingPlugin(options)(baseConfig) as Config;
  const [collection] = config.collections ?? [];
  const [global] = config.globals ?? [];
  return {
    collectionDocument: <Document>(doc: object, req: DraftReadRequest) =>
      lastHookOf(collection?.hooks?.afterOperation)({
        args: { draft: true },
        collection,
        operation: "findByID",
        req,
        result: doc,
      }) as Document,
    global: <Document>(doc: object, req: DraftReadRequest) =>
      lastHookOf(global?.hooks?.afterRead)({ doc, global, req }) as Document,
  };
};
