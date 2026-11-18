import type { Config, Payload } from "payload";

import type { TaskRunner } from "../TaskRunner.interface.js";
import type { RunnerCapabilities } from "../RunnerCapabilities.js";
import type { TaskRunnerContext, TaskRunnerProvider } from "../TaskRunnerProvider.interface.js";
import { SyncTaskRunner } from "./SyncTaskRunner.js";

const INLINE_LEAVES_NOTHING_TO_REACH: RunnerCapabilities = { stop: false, run: false };

/**
 */
export class SyncRunnerProvider implements TaskRunnerProvider {
  readonly capabilities = INLINE_LEAVES_NOTHING_TO_REACH;

  create(payload: Payload, context: TaskRunnerContext): TaskRunner {
    return new SyncTaskRunner(payload, context);
  }

  configure(): (config: Config) => Config {
    return (config) => config;
  }
}

/**
 * Creates a synchronous task runner: translations run inline on enqueue, with no Payload Jobs
 * queue — for development, tests and single-process hosts, not serverless.
 * result as `translatorPlugin({ runner })`.
 *
 * The cancel and run-now routes are **not registered** with this runner, and the admin draws no
 * control for them: a translation is already over by the time the request that asked for it answers.
 * What became of each run is in the plugin's own record, so status survives a restart.
 *
 * @returns A {@link TaskRunnerProvider} for the plugin's `runner` option.
 * @since 1.0.0 — the `maxSize` / `ttlMs` options are gone; see
 * docs/DEPRECATIONS.md#the-runner-only-accepts-work.
 * @example
 * ```ts
 * translatorPlugin({ collections, translationProvider, runner: createSyncRunner() })
 * ```
 */
export function createSyncRunner(): TaskRunnerProvider {
  return new SyncRunnerProvider();
}
