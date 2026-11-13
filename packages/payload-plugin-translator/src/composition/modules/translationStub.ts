import { TranslatorConfigError } from "../../core/errors/TranslatorConfigError.js";
import {
  SCENARIOS,
  StubWorld,
  createStubRoutes,
  isScenarioName,
} from "../../server/modules/translation-stub/index.js";
import type { TranslationModule } from "../../server/modules/plugin-config/index.js";

export type TranslationStubOptions = {
  /** `mixed` when absent: `empty`, `failing`, `slow`, `abilities-limited`, `provenance-off` are the others. */
  scenario?: string;
};

/**
 * Serves the 1.0 admin's reads and the existing action routes from an in-memory world, so the admin
 * can be built before the real read model exists. Branch scaffolding: never published.
 */
export function translationStub({
  scenario = "mixed",
}: TranslationStubOptions = {}): TranslationModule {
  if (!isScenarioName(scenario)) {
    throw new TranslatorConfigError(
      `payload-plugin-translator: no stub scenario is named "${scenario}". ` +
        `Choose one of: ${Object.keys(SCENARIOS).join(", ")}.`
    );
  }
  const chosen = SCENARIOS[scenario];
  const world = new StubWorld(chosen);

  return {
    name: "translation-stub",
    setup(ctx) {
      ctx.addEndpoints(
        createStubRoutes({
          world,
          managed: new Set(ctx.collections.map((collection) => collection.slug)),
          access: ctx.access,
          basePath: ctx.settings.basePath,
          latencyMs: chosen.latencyMs,
          servesCancelAndRunNow: chosen.servesCancelAndRunNow,
        })
      );
    },
  };
}
