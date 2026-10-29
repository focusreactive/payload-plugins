import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import { authorisedHandles } from "../../shared/access/authorised.js";
import { assignmentsFromRows } from "../../modules/runs/index.js";
import type { RunRecordStoreFactory } from "../../modules/runs/index.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";

import { RunInputSchema } from "./model.js";

/** Runs a queued translation now, for hosts whose queue moves only when asked. */
export class RunTranslationHandler {
  private readonly taskRunnerFactory: TaskRunnerFactory;
  private readonly runRecordStoreFactory: RunRecordStoreFactory;

  constructor(taskRunnerFactory: TaskRunnerFactory, runRecordStoreFactory: RunRecordStoreFactory) {
    this.taskRunnerFactory = taskRunnerFactory;
    this.runRecordStoreFactory = runRecordStoreFactory;
  }

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = RunInputSchema.safeParse(req.routeParams);
    if (validationResult.error)
      return ServerResponse.validationError(validationResult.error.issues);

    const { id } = validationResult.data;
    const rows = await this.runRecordStoreFactory(req.payload).findByHandles([id]);
    const [job] = assignmentsFromRows(rows);
    if (!job) return ServerResponse.notFound("Queued task not found");
    if (!job.startedBy) return ServerResponse.forbidden();

    const { authorised } = await authorisedHandles({
      payload: req.payload,
      user: req.user,
      jobs: [job],
    });
    const [thisJob] = authorised;
    if (!thisJob) return ServerResponse.forbidden();

    const runner = this.taskRunnerFactory.create(req.payload);
    if (!runner.run) {
      return ServerResponse.notImplemented("This runner cannot run a job on demand.");
    }

    const result = await runner.run(thisJob);
    if (!result.success) {
      if (result.error === "not_found" || result.error === "already_completed") {
        return ServerResponse.notFound("Queued task not found");
      }
      if (result.error === "already_running") {
        return ServerResponse.tooManyRequests("Translation task is already in progress");
      }
    }

    return ServerResponse.noContent();
  }
}
