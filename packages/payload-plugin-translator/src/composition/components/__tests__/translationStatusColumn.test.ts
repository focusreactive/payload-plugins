/*
 * Boots the plugin: the column is a field only the config builder writes, so only a boot shows where
 * it lands and when it is refused.
 */
import { describe, expect, it, vi } from "vitest";
import type { CollectionConfig, Config, Field } from "payload";

import { translatorPlugin } from "../../../plugin.js";
import type { TranslatorPluginConfig } from "../../../plugin.js";
import { AnyAccessGuard } from "../../../server/shared/access/AnyAccessGuard.js";
import { CollectionFieldClashError } from "../../../server/modules/plugin-config/errors/CollectionFieldClashError.js";
import { TranslationStatusCellExport } from "../../../client/widgets/translation-status-column/index.js";
import { documentTranslation } from "../../modules/index.js";
import { TRANSLATION_STATUS_FIELD, translationStatusColumn } from "../translationStatusColumn.js";
import { translateDocumentControl } from "../translateDocumentControl.js";

const collection = (slug: string, fields: Field[] = []): CollectionConfig => ({
  slug,
  fields: [{ name: "title", type: "text", localized: true }, ...fields],
});

const boot = async (
  components: TranslatorPluginConfig["components"],
  managed: CollectionConfig[],
  host: CollectionConfig[] = managed
) =>
  await translatorPlugin({
    collections: managed,
    translationProvider: { translate: vi.fn() },
    access: new AnyAccessGuard(),
    runner: {
      capabilities: { stop: true, run: true },
      create: vi.fn(),
      configure: () => (config: Config) => config,
    },
    modules: [documentTranslation()],
    components,
  } as unknown as TranslatorPluginConfig)({ collections: host } as unknown as Config);

const fieldsOf = (config: Config, slug: string): readonly Field[] =>
  config.collections?.find((entry) => entry.slug === slug)?.fields ?? [];

const columnOf = (config: Config, slug: string) =>
  fieldsOf(config, slug).find(
    (field) => "name" in field && field.name === TRANSLATION_STATUS_FIELD
  );

describe("the translation status column", () => {
  it("is a ui field with the cell on every managed collection when the component is listed", async () => {
    const pages = collection("pages");
    const config = await boot([translationStatusColumn()], [pages], [pages, collection("users")]);

    const column = columnOf(config, "pages");
    expect(column).toMatchObject({ type: "ui", label: "Translations" });
    expect(column && "admin" in column ? column.admin?.components?.Cell : undefined).toBeInstanceOf(
      TranslationStatusCellExport
    );
    expect(columnOf(config, "users")).toBeUndefined();
  });

  it("is absent when the component is not listed", async () => {
    const config = await boot([translateDocumentControl()], [collection("pages")]);

    expect(columnOf(config, "pages")).toBeUndefined();
  });

  it("is refused at boot on a collection that already has a field of its name", async () => {
    const clashing = collection("pages", [{ name: TRANSLATION_STATUS_FIELD, type: "text" }]);

    await expect(boot([translationStatusColumn()], [clashing])).rejects.toThrow(
      CollectionFieldClashError
    );
  });
});
