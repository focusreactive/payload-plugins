import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared";
import { authCollectionsOf, identityOf } from "../../shared/payload/RequestScope.shapes";
import type { TaskRunnerFactory } from "../../modules/task-runner";
import { extractLocaleCodes } from "../../modules/auto-translate";
import type { LocalizationLike } from "../../modules/auto-translate";
import { isCollectionAvailable, getAllCollectionIds } from "../_lib/collection-utils";

import { Locales } from "../../../core/domain/locales";

import { EnqueueInputSchema } from "./model";
import type { EnqueueConfig } from "./model";

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

    // Writing a phantom locale orphans rows on Mongo/SQLite, errors on Postgres' locale enum, and
    // with no localization at all overwrites the single unlocalized field — wiping the source.
    const knownLocales = extractLocaleCodes(
      req.payload.config?.localization as LocalizationLike | undefined
    );
    if (!knownLocales)
      return ServerResponse.badRequest(
        "Localization is not enabled in this Payload config; there are no target locales to translate into"
      );

    // `resolveTargets` only excludes the source from the targets, so an unconfigured code would
    // otherwise reach `payload.findByID({ locale })` unchecked.
    if (!knownLocales.has(source_lng))
      return ServerResponse.badRequest(
        `source_lng "${source_lng}" is not one of this project's configured locales`
      );

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

    await runner.enqueue(
      tasks,
      identityOf(req, authCollectionsOf(req.payload), req.payload.logger)
    );

    return ServerResponse.success({ success: true, queued: tasks.length });
  }
}
