import type { Endpoint } from "payload";

import { withErrorHandler, withAccessCheck } from "../../shared/index.js";
import type { AccessGuard } from "../../shared/index.js";
import type { TaskRunnerFactory } from "../../modules/task-runner/index.js";
import type { RunRecordStoreFactory } from "../../modules/runs/index.js";
import { ENDPOINTS } from "../../../types/wire/endpoints.js";

import type { EnqueueConfig } from "./model.js";
import { EnqueueTranslationHandler } from "./handler.js";

export function createEnqueueRoute(
  taskRunnerFactory: TaskRunnerFactory,
  runRecordStoreFactory: RunRecordStoreFactory,
  config: EnqueueConfig,
  access: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new EnqueueTranslationHandler(config, taskRunnerFactory, runRecordStoreFactory);

  return {
    path: `${basePath}${ENDPOINTS.enqueue.path}`,
    method: ENDPOINTS.enqueue.method,
    handler: withAccessCheck(
      withErrorHandler(handler.handleDocument.bind(handler)),
      access,
      "enqueue"
    ),
  };
}

export function createEnqueueListRoute(
  taskRunnerFactory: TaskRunnerFactory,
  runRecordStoreFactory: RunRecordStoreFactory,
  config: EnqueueConfig,
  access: AccessGuard,
  basePath = "/translate"
): Endpoint {
  const handler = new EnqueueTranslationHandler(config, taskRunnerFactory, runRecordStoreFactory);

  return {
    path: `${basePath}${ENDPOINTS.enqueueList.path}`,
    method: ENDPOINTS.enqueueList.method,
    handler: withAccessCheck(
      withErrorHandler(handler.handleList.bind(handler)),
      access,
      "enqueue-list"
    ),
  };
}
