import type { CollectionSlug, PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import { authCollectionsOf, identityOf, scopeOf } from "../../shared/payload/identityOf.js";
import type { TaskInput, TaskRunnerFactory } from "../../modules/task-runner/index.js";
import type { RunRecordStoreFactory } from "../../modules/runs/index.js";
import { admitWork } from "../../../core/domain/runs/index.js";
import { isCollectionAvailable } from "../_lib/collection-utils.js";
import { getAllCollectionIds } from "../../shared/payload/collections.js";
import { authorisedByTheReadFilter, authorisedWork } from "../../shared/access/authorised.js";
import type { AuthorisedWork } from "../../shared/access/authorised.js";

import { Locales } from "../../../core/domain/locales/index.js";
import type { TranslationFilter } from "../../../core/domain/selection/index.js";
import { localesHoldingContent } from "../../shared/payload/localesHoldingContent.js";
import { worldOfRegistered } from "../../shared/payload/worldOfCollection.js";

import {
  EnqueueDocumentInputSchema,
  EnqueueListInputSchema,
  toAssignmentOutputs,
  wholeDocumentOnly,
} from "./model.js";
import type { EnqueueAsk, EnqueueConfig } from "./model.js";

const documentsIn = (work: readonly AuthorisedWork[]): string[] => [
  ...new Set(work.map((item) => item.collectionId)),
];

type WhichDocuments = { kind: "named"; ids: readonly string[] } | { kind: "every" };

export class EnqueueTranslationHandler {
  private readonly config: EnqueueConfig;
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private readonly runRecordStoreFactory: RunRecordStoreFactory;

  constructor(
    config: EnqueueConfig,
    taskRunnerFactory: TaskRunnerFactory,
    runRecordStoreFactory: RunRecordStoreFactory
  ) {
    this.config = config;
    this.taskRunnerFactory = taskRunnerFactory;
    this.runRecordStoreFactory = runRecordStoreFactory;
  }

  private async localesHoldingNothing(asking: {
    req: PayloadRequest;
    collectionSlug: CollectionSlug;
    ids: readonly string[];
    targets: readonly string[];
    asked: readonly TranslationFilter[];
  }): Promise<string[]> {
    const { req, collectionSlug, ids, targets, asked } = asking;
    const namesAddresses = asked.some((filter) => filter.kind === "leaves");
    if (!namesAddresses) return [];

    if (!this.config.canHoldText(collectionSlug)) return [];

    const world = worldOfRegistered(req.payload, collectionSlug);
    const writeLandsInAnUnvalidatedDraft = world.kind === "layered";
    if (writeLandsInAnUnvalidatedDraft) return [];

    const holding = await localesHoldingContent({
      payload: req.payload,
      collection: collectionSlug,
      grantedIds: ids,
      locales: targets,
      holdsText: this.config.holdsText,
    });
    return targets.filter((locale) => ids.some((id) => holding.get(locale)?.has(id) !== true));
  }

  async handleDocument(req: PayloadRequest): Promise<Response> {
    const parsed = EnqueueDocumentInputSchema.safeParse(await req.json?.());
    if (parsed.error) return ServerResponse.validationError(parsed.error.issues);

    const { collection_id, ...ask } = parsed.data;
    return await this.enqueue(req, ask, { kind: "named", ids: collection_id });
  }

  async handleList(req: PayloadRequest): Promise<Response> {
    const parsed = EnqueueListInputSchema.safeParse(await req.json?.());
    if (parsed.error) return ServerResponse.validationError(parsed.error.issues);

    const { collection_id, select_all, ...ask } = parsed.data;
    const which: WhichDocuments = select_all
      ? { kind: "every" }
      : { kind: "named", ids: collection_id };
    return await this.enqueue(req, ask, which);
  }

  private async enqueue(
    req: PayloadRequest,
    ask: EnqueueAsk,
    which: WhichDocuments
  ): Promise<Response> {
    const { source_lng: sourceLng, publish_on_translation: publishOnTranslation } = ask;
    const asked = ask.filters ?? [];

    const collectionSlug = isCollectionAvailable(
      ask.collection_slug,
      this.config.availableCollections
    );
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

    if (!knownLocales.has(sourceLng)) {
      return ServerResponse.badRequest(
        `source_lng "${sourceLng}" is not one of this project's configured locales`
      );
    }

    const { targets, droppedUnknown } = Locales.resolveTargets({
      target_lng: ask.target_lng,
      source_lng: sourceLng,
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
          sourceLng,
          targetLng,
          filters: asked,
          publishOnTranslation,
        }))
      );

    const identity = identityOf(req, authCollectionsOf(req.payload), req.payload.logger);
    if (identity.kind === "unnameable") return ServerResponse.forbidden();

    const everyDocument = which.kind === "every";
    const ids = everyDocument
      ? await getAllCollectionIds(req.payload, collectionSlug, req.user)
      : which.ids;

    const runs = this.runRecordStoreFactory(req.payload);
    const { authorised, refused } = everyDocument
      ? { authorised: authorisedByTheReadFilter(workFor(ids)), refused: [] }
      : await authorisedWork({ payload: req.payload, user: req.user, tasks: workFor(ids) });

    const unwritten = await this.localesHoldingNothing({
      req,
      collectionSlug,
      ids: documentsIn(authorised),
      targets,
      asked,
    });
    if (unwritten.length > 0) return ServerResponse.badRequest(wholeDocumentOnly(unwritten));

    const inFlight = everyDocument
      ? await runs.findLiveInCollection(collectionSlug)
      : await runs.findLiveForDocuments(collectionSlug, documentsIn(authorised));
    const { admitted, busyDocumentIds: busy } = admitWork({ work: authorised, inFlight });

    const runner = this.taskRunnerFactory.create(req.payload);
    const assigned = await runner.enqueue(admitted, scopeOf(identity));

    return ServerResponse.success({
      success: true,
      queued: admitted.length,
      ...(refused.length > 0 ? { refused } : {}),
      ...(busy.length > 0 ? { busy } : {}),
      ...(assigned ? { assignments: toAssignmentOutputs(assigned) } : {}),
    });
  }
}
