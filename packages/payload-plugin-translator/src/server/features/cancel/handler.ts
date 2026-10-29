import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import { authorisedHandles } from "../../shared/access/authorised.js";
import { assignmentsFromRows } from "../../modules/runs/index.js";
import type { RunRecordStoreFactory } from "../../modules/runs/index.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";

import { CancelInputSchema } from "./model.js";

/**
 * Stops the runs these handles name, as far as the runner can.
 *
 * The document behind a handle comes from the plugin's own record: Payload's `update` rule is asked
 * about a document, so a handle the record does not know names nothing to ask about, and is neither
 * stopped nor refused.
 */
export class CancelHandler {
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private readonly runRecordStoreFactory: RunRecordStoreFactory;

  constructor(taskRunnerFactory: TaskRunnerFactory, runRecordStoreFactory: RunRecordStoreFactory) {
    this.taskRunnerFactory = taskRunnerFactory;
    this.runRecordStoreFactory = runRecordStoreFactory;
  }

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = CancelInputSchema.safeParse(await req.json?.());
    if (validationResult.error) {
      return ServerResponse.validationError(validationResult.error.issues);
    }

    const { ids } = validationResult.data;
    const rows = await this.runRecordStoreFactory(req.payload).findByHandles(ids);

    const { authorised, refused } = await authorisedHandles({
      payload: req.payload,
      user: req.user,
      jobs: assignmentsFromRows(rows),
    });

    const runner = this.taskRunnerFactory.create(req.payload);
    if (!runner.stop) return ServerResponse.notImplemented("This runner cannot stop work.");
    await runner.stop(authorised);

    if (refused.length === 0) return ServerResponse.noContent();
    return ServerResponse.success({ refused });
  }
}
