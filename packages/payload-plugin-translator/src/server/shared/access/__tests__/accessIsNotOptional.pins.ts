/** Never imported and never run: `check-types` fails if any `@ts-expect-error` below stops being an error. */

import type { PayloadRequest } from "payload";

import { createEnqueueRoute } from "../../../features/enqueue-translation/index.js";
import type { TaskRunnerFactory } from "../../../modules/task-runner/index.js";
import type { ConfigTimeContext } from "../../../modules/plugin-config/index.js";
import { withAccessCheck } from "../../http/withAccessCheck.js";
import type { AccessGuard } from "../types.js";

declare const handler: (req: PayloadRequest) => Promise<Response>;
declare const runner: TaskRunnerFactory;
declare const guard: AccessGuard;

// @ts-expect-error every route is guarded: there is no "open by omission"
withAccessCheck(handler);

// @ts-expect-error a route factory cannot be built without a guard either
createEnqueueRoute(runner, { availableCollections: new Set<string>() }, undefined, "/translate");

// @ts-expect-error the shared context carries a guard, never the absence of one
const _contextWithoutAGuard: ConfigTimeContext["access"] = undefined;

// the positive control: with a guard, the same call compiles
withAccessCheck(handler, guard);
