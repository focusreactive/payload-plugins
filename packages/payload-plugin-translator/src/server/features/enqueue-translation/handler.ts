import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared";
import type { TaskRunnerFactory } from "../../modules/task-runner";
import { extractLocaleCodes } from "../../modules/auto-translate";
import type { LocalizationLike } from "../../modules/auto-translate";
import { isCollectionAvailable, getAllCollectionIds } from "../_lib/collection-utils";

import { Locales } from "../../../core/domain/locales";

import { EnqueueInputSchema } from "./model";
import type { EnqueueConfig } from "./model";

/**
 * Enqueues translation tasks for documents
 */
export class EnqueueTranslationHandler {
  constructor(
    private readonly config: EnqueueConfig,
    private readonly taskRunnerFactory: TaskRunnerFactory
  ) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = EnqueueInputSchema.safeParse(await req.json?.());
    if (validationResult.error)
      return ServerResponse.validationError(validationResult.error.issues);

    const {
      source_lng,
      target_lng,
      collection_slug,
      collection_id,
      select_all,
      strategy,
      publish_on_translation,
    } = validationResult.data;

    const collectionSlug = isCollectionAvailable(collection_slug, this.config.availableCollections);
    if (!collectionSlug)
      return ServerResponse.badRequest(
        "Content of this collection is not available for translation"
      );

    // A localization-less config has no valid target locale: a phantom locale would burn a provider
    // call and corrupt data — orphaned rows on Mongo/SQLite, a locale-enum error on Postgres, or (with
    // no localization at all) overwrite the single unlocalized field and wipe the source. Reject before
    // anything is enqueued.
    const knownLocales = extractLocaleCodes(
      req.payload.config?.localization as LocalizationLike | undefined
    );
    if (!knownLocales)
      return ServerResponse.badRequest(
        "Localization is not enabled in this Payload config; there are no target locales to translate into"
      );

    // Normalize the scalar-or-array target into the concrete locales to fan out to: de-dup, exclude the
    // source, and drop locales that are not configured.
    const { targets, droppedUnknown } = Locales.resolveTargets({
      target_lng,
      source_lng,
      knownLocales,
    });
    if (droppedUnknown.length > 0) {
      req.payload.logger?.warn(
        `[payload-plugin-translator] enqueue on "${collectionSlug}": ignoring unknown target locale(s) ${droppedUnknown.join(
          ", "
        )} (configured locales: ${[...knownLocales].join(", ")}).`
      );
    }
    if (targets.length === 0)
      return ServerResponse.badRequest(
        "No valid target locales to translate into (all requested locales were the source or unknown)"
      );

    const collectionIds = select_all
      ? await getAllCollectionIds(req.payload, collectionSlug)
      : collection_id;

    const runner = this.taskRunnerFactory.create(req.payload);
    // One task per (document x target locale). The runner keys/supersedes per (document, targetLng),
    // so N concurrent targets of one document coexist (PR #75) — no runner change needed.
    const tasks = collectionIds.flatMap((id) =>
      targets.map((targetLng) => ({
        collectionSlug,
        collectionId: id,
        sourceLng: source_lng,
        targetLng,
        strategy: strategy,
        publishOnTranslation: publish_on_translation,
      }))
    );

    await runner.enqueue(tasks);

    return ServerResponse.success({ success: true, queued: tasks.length });
  }
}
