import type { Payload } from "payload";

import type { TaskRunner } from "../TaskRunner.interface.js";
import type { TaskRunnerContext } from "../TaskRunnerProvider.interface.js";
import type { EnqueueAssignment, TaskInput } from "../types.js";
import type { RequestScope } from "../../../shared/payload/RequestScope.shapes.js";
import { swallowOrThrow } from "../../../shared/payload/swallowOrThrow.js";

const NEVER_RETRIED = 0;

/**
 * Runs each task inline on `enqueue`, so a translation is finished by the time the call resolves.
 */
export class SyncTaskRunner implements TaskRunner {
  private readonly payload: Payload;
  private readonly context: TaskRunnerContext;

  constructor(payload: Payload, context: TaskRunnerContext) {
    this.payload = payload;
    this.context = context;
  }

  async enqueue(inputs: TaskInput[], scope: RequestScope = {}): Promise<EnqueueAssignment[]> {
    const assigned: EnqueueAssignment[] = [];
    const served = new Set<string>();

    for (const input of inputs) {
      const key = `${input.collectionSlug}:${input.collectionId}:${input.targetLng}`;
      if (served.has(key)) continue;
      served.add(key);

      const handle = crypto.randomUUID();
      const assignment: EnqueueAssignment = {
        collectionSlug: input.collectionSlug,
        collectionId: input.collectionId,
        sourceLng: input.sourceLng,
        targetLng: input.targetLng,
        handle,
      };
      assigned.push(assignment);
      const run = { handle, targetLng: input.targetLng };
      await this.context.report(
        this.payload,
        run,
        {
          state: "queued",
          work: {
            collectionSlug: input.collectionSlug,
            collectionId: input.collectionId,
            sourceLng: input.sourceLng,
            filters: input.filters,
            publishOnTranslation: input.publishOnTranslation,
          },
        },
        scope
      );

      await swallowOrThrow(
        scope,
        async () => {
          await this.context.handler(
            this.payload,
            { handle, targetLng: input.targetLng, previousAttempts: NEVER_RETRIED },
            scope
          );
          await this.context.report(this.payload, run, { state: "delivered" }, scope);
        },
        async (error) => {
          await this.context.report(this.payload, run, { state: "failed", error }, scope);
        }
      );
    }

    return assigned;
  }
}
