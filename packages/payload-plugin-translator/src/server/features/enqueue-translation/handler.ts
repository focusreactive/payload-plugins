import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import { authCollectionsOf, identityOf, scopeOf } from "../../shared/payload/identityOf.js";
import type { TaskInput, TaskRunnerFactory } from "../../modules/task-runner/index.js";
import { isCollectionAvailable } from "../_lib/collection-utils.js";
import { getAllCollectionIds } from "../../shared/payload/collections.js";
import { authorisedByTheReadFilter, authorisedWork } from "../../shared/access/authorised.js";

import { Locales } from "../../../core/domain/locales/index.js";

import { EnqueueInputSchema, toAssignmentOutputs } from "./model.js";
import type { EnqueueConfig } from "./model.js";

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

    const workFor = (ids: readonly string[]): TaskInput[] =>
      ids.flatMap((id) =>
        targets.map((targetLng) => ({
          collectionSlug,
          collectionId: id,
          sourceLng: source_lng,
          targetLng,
          filters: asked,
          publishOnTranslation: publish_on_translation,
        }))
      );

    const { authorised, refused } = select_all
      ? {
          authorised: authorisedByTheReadFilter(
            workFor(await getAllCollectionIds(req.payload, collectionSlug, req.user))
          ),
          refused: [],
        }
      : await authorisedWork({
          payload: req.payload,
          user: req.user,
          tasks: workFor(collection_id),
        });

    const identity = identityOf(req, authCollectionsOf(req.payload), req.payload.logger);
    if (identity.kind === "unnameable") return ServerResponse.forbidden();

    const runner = this.taskRunnerFactory.create(req.payload);
    const assigned = await runner.enqueue(authorised, scopeOf(identity));

    return ServerResponse.success({
      success: true,
      queued: authorised.length,
      ...(refused.length > 0 ? { refused } : {}),
      ...(assigned ? { assignments: toAssignmentOutputs(assigned) } : {}),
    });
  }
}
