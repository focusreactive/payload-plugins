import { describe, it, expect, vi } from "vitest";
import type { Config } from "payload";

import { configureAutoTranslate } from "../AutoTranslate.wiring.js";
import { TranslatorConfigError } from "../../../../core/errors/index.js";
import { AUTO_TRANSLATE_CUSTOM_KEY } from "../../../../core/domain/auto-translate/index.js";
import type { CollectionSchemaMap } from "../../../../types/CollectionSchemaMap.js";
import type { TaskRunnerFactory } from "../../task-runner/index.js";
import { fingerprintsOf } from "../../provenance/__tests__/fixtures/fingerprinter.js";
import { storeDouble } from "../../runs/__tests__/fixtures/runRecordStore.js";

const collectionWith = (targets: string[]) => ({
  slug: "posts",
  custom: { [AUTO_TRANSLATE_CUSTOM_KEY]: { targets } },
});

const buildConfig = (locales: string[] | false, targets: string[]) => {
  const collection = collectionWith(targets);
  const config = {
    collections: [collection],
    localization: locales === false ? undefined : { locales, defaultLocale: locales[0] },
  } as unknown as Config;

  const autoTranslate = configureAutoTranslate(
    [collection],
    fingerprintsOf(new Map() as CollectionSchemaMap),
    (() => ({})) as unknown as TaskRunnerFactory,
    () => storeDouble()
  );
  autoTranslate.configure(new Set(["posts"]))(config);

  const written = (config.collections?.[0] as { custom?: Record<string, { targets: string[] }> })
    ?.custom?.[AUTO_TRANSLATE_CUSTOM_KEY];
  return written?.targets;
};

/**
 * A target the project has no locale for cannot be translated into, and nothing downstream rejects
 * it: the hook would enqueue it, the provider would be paid, and the result would be written under a
 * locale the project cannot serve. The only place that can refuse is here, while the config is still
 * being assembled and before any hook exists to fire.
 */
describe("auto-translate rejects locales the project does not have, while the config is built", () => {
  it("keeps the targets the project declares", () => {
    expect(buildConfig(["en", "de", "fr"], ["de", "fr"])).toEqual(["de", "fr"]);
  });

  it("drops a target no locale matches", () => {
    expect(buildConfig(["en", "de"], ["de", "xx"])).toEqual(["de"]);
  });

  // Dropping the last target leaves auto-translate configured and inert. The warning that covers a
  // single mistyped locale cannot carry that, because nothing distinguishes it from the case where
  // the other targets still work.
  it("refuses when no target survives, naming the collection and both lists", () => {
    const refusal = () => buildConfig(["en", "de"], ["xx", "yy"]);

    expect(refusal).toThrow(TranslatorConfigError);
    expect(refusal).toThrow(/posts/u);
    expect(refusal).toThrow(/xx, yy/u);
    expect(refusal).toThrow(/en, de/u);
  });

  // A list the host wrote empty is a way to keep auto-translate off, not a mistyped locale. Hosts
  // that fill it from the environment would otherwise be unable to start.
  it("leaves an empty target list alone", () => {
    expect(() => buildConfig(["en", "de"], [])).not.toThrow();
    expect(buildConfig(["en", "de"], [])).toEqual([]);
  });

  it("warns instead of enqueueing when the project has no localization at all", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    buildConfig(false, ["de"]);

    expect(warn.mock.calls.flat().join(" ")).toContain("localization is disabled");
    warn.mockRestore();
  });
});
