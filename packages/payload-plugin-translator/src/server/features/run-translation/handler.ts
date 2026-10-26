import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import { authorisedHandles } from "../../shared/access/authorised.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";

import { RunInputSchema } from "./model.js";

/**
 * Runs a translation task by ID
 */
export class RunTranslationHandler {
  constructor(private readonly taskRunnerFactory: TaskRunnerFactory) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = RunInputSchema.safeParse(req.routeParams);
    if (validationResult.error)
      return ServerResponse.validationError(validationResult.error.issues);

    const { id } = validationResult.data;
    const runner = this.taskRunnerFactory.create(req.payload);

    const [job] = await runner.assignmentsOf([id]);
    if (!job) return ServerResponse.notFound("Queued task not found");

    // No recorded requester means the worker writes with access off (`enforcedAtTheWrite`).
    if (!job.startedBy) return ServerResponse.forbidden();

    const { authorised } = await authorisedHandles({
      payload: req.payload,
      user: req.user,
      jobs: [job],
    });
    const [thisJob] = authorised;
    if (!thisJob) return ServerResponse.forbidden();

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
