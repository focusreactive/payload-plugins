import type { Payload } from "payload";

import type { ConfigModifier } from "../../../types/ConfigModifier.js";
import { LifecycleNotifier } from "../../modules/lifecycle/index.js";
import type {
  TranslationLifecycleCallbacks,
  TranslationTask,
} from "../../modules/lifecycle/index.js";
import { filtersFromStore, RunRecordMissing, storedFilters } from "../../modules/runs/index.js";
import type { RunRecord, RunRecordStoreFactory } from "../../modules/runs/index.js";
import type { RunOutcome } from "../../modules/runs/RunRecord.types.js";
import type {
  TaskRunnerContext,
  TaskRunnerFactory,
  TaskRunnerProvider,
} from "../../modules/task-runner/index.js";
import { toClientErrorMessage } from "../../shared/http/index.js";
import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import { asRequester } from "../../shared/payload/RequestScope.shapes.js";
import { swallowOrThrow } from "../../shared/payload/swallowOrThrow.js";

import { translateDocument } from "./translateDocument.js";
import type { TranslateDocumentDeps, TranslateDocumentInput } from "./translateDocument.js";

type WireTranslateRunnerParams = {
  translation: TranslateDocumentDeps;
  runner: TaskRunnerProvider;
  lifecycle: TranslationLifecycleCallbacks;
  storeFactory: RunRecordStoreFactory;
};

const now = (): string => new Date().toISOString();

const requesterIdOf = (scope: RequestScope): string | null =>
  scope.requester == null ? null : String(scope.requester.userId);

/** Only a message is ours to store; the error itself may carry anything the provider put on it. */
function messageOf(error: unknown): string | undefined {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return undefined;
}

const whatToTranslate = (row: RunRecord, previousAttempts: number): TranslateDocumentInput => ({
  collection: row.collectionSlug,
  collectionId: row.collectionId,
  sourceLng: row.sourceLng,
  targetLng: row.targetLng,
  filters: filtersFromStore(row.filters),
  publishOnTranslation: row.publishOnTranslation,
  previousAttempts,
});

const documentOf = (work: { collectionSlug: string; collectionId: string; sourceLng: string }) => ({
  collection: work.collectionSlug,
  id: work.collectionId,
  sourceLng: work.sourceLng,
});

const taskFromRow = (row: RunRecord): TranslationTask => ({
  collection: row.collectionSlug,
  id: row.collectionId,
  sourceLng: row.sourceLng,
  targetLng: row.targetLng,
  handle: row.handle,
});

/**
 * The write policy for every row except the queued one: a lost stamp or settlement costs a
 * timestamp, which is not worth failing a translation the host has already paid for.
 */
function writeOrLog(
  payload: Payload,
  scope: RequestScope,
  write: () => Promise<void>
): Promise<void> {
  return swallowOrThrow(scope, write, (err) =>
    payload.logger?.error?.({ err, msg: "[translator] the run record was not updated" })
  );
}

/**
 * Assembles the document-translation pipeline: the runner context, the runner's config modifier and
 * the per-request {@link TaskRunnerFactory}.
 *
 * The record is written before the host's callback in every branch: the callback is best-effort by
 * contract, the record is what the status, cancel and run-now routes answer from.
 */
export function wireTranslateRunner({
  translation,
  runner,
  lifecycle,
  storeFactory,
}: WireTranslateRunnerParams): {
  taskRunnerFactory: TaskRunnerFactory;
  configModifier: ConfigModifier;
} {
  const runnerContext: TaskRunnerContext = {
    handler: async (payload, input, scope) => {
      const asked = scope ?? {};
      const runs = storeFactory(payload, asked);
      const key = { handle: input.handle, targetLng: input.targetLng };
      const row = await runs.find(key);
      if (row === null) throw new RunRecordMissing(key.handle, key.targetLng);

      await writeOrLog(payload, asked, () =>
        runs.recordStarted(key, { startedAt: now(), attempts: input.previousAttempts + 1 })
      );

      await translateDocument(translation, payload, whatToTranslate(row, input.previousAttempts), {
        ...asked,
        requester: asRequester(row.requesterId, row.requesterCollection),
      });
    },
    report: async (payload, run, event, scope) => {
      const asked = scope ?? {};
      const runs = storeFactory(payload, asked);
      const notifier = new LifecycleNotifier(lifecycle, payload.logger);

      if (event.state === "queued") {
        await runs.recordQueued({
          handle: run.handle,
          targetLng: run.targetLng,
          collectionSlug: event.work.collectionSlug,
          collectionId: event.work.collectionId,
          sourceLng: event.work.sourceLng,
          filters: storedFilters(event.work.filters),
          publishOnTranslation: event.work.publishOnTranslation,
          requesterId: requesterIdOf(asked),
          requesterCollection: asked.requester?.userCollection ?? null,
          queuedAt: now(),
        });
        return await notifier.queued({ ...run, ...documentOf(event.work) });
      }

      const settle = (outcome: RunOutcome, error: string | null) =>
        writeOrLog(payload, asked, () =>
          runs.recordSettled(run, { settledAt: now(), outcome, error })
        );

      const row = await runs.find(run);
      const task = row === null ? null : taskFromRow(row);

      switch (event.state) {
        case "delivered":
          await settle("delivered", null);
          return await (task === null ? undefined : notifier.completed(task));
        case "failed":
          await settle("failed", toClientErrorMessage(messageOf(event.error)));
          return await (task === null ? undefined : notifier.failed(task, event.error));
        case "cancelled":
          await settle("cancelled", null);
          return await (task === null ? undefined : notifier.cancelled(task));
      }
    },
  };

  const taskRunnerFactory: TaskRunnerFactory = {
    create: (payload) => runner.create(payload, runnerContext),
    capabilities: runner.capabilities,
  };

  return { taskRunnerFactory, configModifier: runner.configure(runnerContext) };
}
