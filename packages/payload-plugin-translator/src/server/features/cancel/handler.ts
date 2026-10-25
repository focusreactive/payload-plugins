import type { PayloadRequest } from "payload";

import { ServerResponse } from "../../shared/index.js";
import { authorisedHandles } from "../../shared/access/authorised.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";

import { CancelInputSchema } from "./model.js";

/**
 * Cancels and deletes translation tasks by IDs
 */
export class CancelHandler {
  constructor(private readonly taskRunnerFactory: TaskRunnerFactory) {}

  async handle(req: PayloadRequest): Promise<Response> {
    const validationResult = CancelInputSchema.safeParse(await req.json?.());
    if (validationResult.error) {
      return ServerResponse.validationError(validationResult.error.issues);
    }

    const { ids } = validationResult.data;
    const runner = this.taskRunnerFactory.create(req.payload);

    if (!runner.assignmentsOf) return ServerResponse.forbidden();

    const { authorised, refused } = await authorisedHandles({
      payload: req.payload,
      user: req.user,
      jobs: await runner.assignmentsOf(ids),
    });

    await runner.cancel(authorised);

    if (refused.length === 0) return ServerResponse.noContent();
    return ServerResponse.success({ refused });
  }
}
