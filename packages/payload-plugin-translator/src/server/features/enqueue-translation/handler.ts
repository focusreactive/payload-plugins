import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared";
import type { TaskRunnerFactory } from "../../modules/task-runner";
import { extractLocaleCodes } from "../../modules/auto-translate";
import type { LocalizationLike } from "../../modules/auto-translate";
import { isCollectionAvailable, getAllCollectionIds } from "../_lib/collection-utils";

import { EnqueueInputSchema } from "./model";
import type { EnqueueConfig } from "./model";
import { resolveTargetLocales } from "./resolveTargetLocales";

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

    // Normalize the scalar-or-array target into the concrete locales to fan out to: de-dup, exclude the
    // source, and drop locales that are not configured (unknown locales would burn a provider call and
    // corrupt data — Postgres locale enum / orphaned Mongo rows). `config` is optional-chained because a
    // localization-less (or minimally-mocked) payload has none, which correctly disables the filter.
    const knownLocales = extractLocaleCodes(
      req.payload.config?.localization as LocalizationLike | undefined
    );
    const { targets, droppedUnknown } = resolveTargetLocales({
      target_lng,
      source_lng,
      knownLocales,
    });
    if (droppedUnknown.length > 0) {
      req.payload.logger?.warn(
        `[payload-plugin-translator] enqueue on "${collectionSlug}": ignoring unknown target locale(s) ${droppedUnknown.join(
          ", "
        )} (configured locales: ${knownLocales ? [...knownLocales].join(", ") : "n/a"}).`
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
