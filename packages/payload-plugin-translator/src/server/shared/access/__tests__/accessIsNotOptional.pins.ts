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

// @ts-expect-error a guarded route must also say which action it is guarding
withAccessCheck(handler, guard);

// @ts-expect-error the action is a closed union, not any string
withAccessCheck(handler, guard, "whatever-the-caller-felt-like");

// the positive control: with a guard and an action, the same call compiles
withAccessCheck(handler, guard, "enqueue");
