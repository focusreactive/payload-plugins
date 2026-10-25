import type { CollectionSlug, Payload, PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import { authCollectionsOf, identityOf } from "../../shared/payload/identityOf.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";
import { isCollectionAvailable } from "../_lib/collection-utils.js";
import { getAllCollectionIds } from "../../shared/payload/collections.js";
import { refusedTargets } from "../../shared/access/refusedTargets.js";

import { Locales } from "../../../core/domain/locales/index.js";

import { EnqueueInputSchema, toAssignmentOutputs } from "./model.js";
import type { EnqueueConfig } from "./model.js";

type Selection = { collectionIds: readonly string[]; refused: Set<string> };

/**
 * Payload narrows a `select_all` read to what this caller may see inside its own query; a named list
 * arrives unexamined, so each id is asked about before any of them is queued.
 */
async function documentsToQueue(query: {
  payload: Payload;
  collection: CollectionSlug;
  named: readonly string[];
  selectAll: boolean | undefined;
  user: PayloadRequest["user"];
}): Promise<Selection> {
  const { payload, collection, named, selectAll, user } = query;

  if (selectAll) {
    return {
      collectionIds: await getAllCollectionIds(payload, collection, user),
      refused: new Set<string>(),
    };
  }

  const refused = await refusedTargets({ payload, collection, ids: named, user });
  return { collectionIds: named.filter((id) => !refused.has(id)), refused };
}

export class EnqueueTranslationHandler {
  private readonly config: EnqueueConfig;
  private readonly taskRunnerFactory: TaskRunnerFactory;

  constructor(config: EnqueueConfig, taskRunnerFactory: TaskRunnerFactory) {
    this.config = config;
    this.taskRunnerFactory = taskRunnerFactory;
  }

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
      filters,
      publish_on_translation,
    } = validationResult.data;

    const asked = filters ?? [];

    const collectionSlug = isCollectionAvailable(collection_slug, this.config.availableCollections);
    if (!collectionSlug) {
      return ServerResponse.badRequest(
        "Content of this collection is not available for translation"
      );
    }

    const knownLocales = Locales.knownCodes(req.payload.config?.localization);
    if (!knownLocales) {
      return ServerResponse.badRequest(
        "Localization is not enabled in this Payload config; there are no target locales to translate into"
      );
    }

    if (!knownLocales.has(source_lng)) {
      return ServerResponse.badRequest(
        `source_lng "${source_lng}" is not one of this project's configured locales`
      );
    }

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

    if (targets.length === 0) {
      return ServerResponse.badRequest(
        "No valid target locales to translate into (all requested locales were the source or unknown)"
      );
    }

    const { collectionIds, refused } = await documentsToQueue({
      payload: req.payload,
      collection: collectionSlug,
      named: collection_id,
      selectAll: select_all,
      user: req.user,
    });

    const runner = this.taskRunnerFactory.create(req.payload);
    const tasks = collectionIds.flatMap((id) =>
      targets.map((targetLng) => ({
        collectionSlug,
        collectionId: id,
        sourceLng: source_lng,
        targetLng,
        filters: asked,
        publishOnTranslation: publish_on_translation,
      }))
    );

    const assigned = await runner.enqueue(
      tasks,
      identityOf(req, authCollectionsOf(req.payload), req.payload.logger)
    );

    return ServerResponse.success({
      success: true,
      queued: tasks.length,
      ...(refused.size > 0 ? { refused: [...refused] } : {}),
      ...(assigned ? { assignments: toAssignmentOutputs(assigned) } : {}),
    });
  }
}
