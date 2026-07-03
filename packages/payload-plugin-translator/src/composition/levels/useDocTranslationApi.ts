import { createTranslationRoutes } from "../../server/features/createTranslationRoutes";

import type { LevelContext } from "../../server/modules/translation-levels";

/**
 * Contribute the runner-agnostic document-translation API — the shared 6-route
 * bundle, bound to the level context's runner. Both `documentLevel` and
 * `collectionLevel` call this; the plugin deduplicates the endpoints by method +
 * path, so the bundle registers exactly once.
 */
export function useDocTranslationApi(ctx: LevelContext): void {
  ctx.addEndpoints(
    createTranslationRoutes({
      taskRunnerFactory: ctx.taskRunnerFactory,
      collectionConfig: {
        availableCollections: new Set(ctx.collections.map((collection) => collection.slug)),
      },
      access: ctx.access,
      basePath: ctx.basePath,
    })
  );
}
