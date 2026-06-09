import type { Config, Payload } from "payload";

import type { TaskRunner } from "../TaskRunner.interface";
import type { TaskRunnerProvider, TaskHandler } from "../TaskRunnerProvider.interface";
import type { Task } from "../types";
import type { SyncRunnerOptions } from "./types";
import { SyncTaskRunner } from "./SyncTaskRunner";
import { LazyMap } from "../../../shared/utils";

const DEFAULT_MAX_SIZE = 100;
const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Synchronous TaskRunnerProvider implementation.
 *
 * Executes translations immediately without Payload Jobs.
 * Useful for development, testing, or simple use cases.
 */
export class SyncRunnerProvider implements TaskRunnerProvider {
  private readonly tasks: LazyMap<string, Task>;

  constructor(options?: SyncRunnerOptions) {
    const maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE;
    const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;

    this.tasks = new LazyMap<string, Task>({
      maxSize,
      ttlMs,
      isRemovable: (task) => task.status === "completed" || task.status === "failed",
      getTimestamp: (task) => new Date(task.updatedAt).getTime(),
    });
  }

  // SyncRunner executes the translation inline on enqueue, so it needs the
  // handler at create time — taken from the caller-supplied argument rather than
  // stashed on the instance during configure(). No ambient state, no ordering
  // coupling: create() is a pure function of its arguments.
  create(payload: Payload, handler: TaskHandler): TaskRunner {
    return new SyncTaskRunner(payload, handler, this.tasks);
  }

  // No config changes needed — translations run synchronously, no Payload jobs.
  configure(): (config: Config) => Config {
    return (config) => config;
  }
}

/**
 * Creates a synchronous TaskRunnerProvider.
 *
 * Executes translations immediately without queuing.
 * Results are stored in memory and lost on server restart.
 */
export function createSyncRunner(options?: SyncRunnerOptions): TaskRunnerProvider {
  return new SyncRunnerProvider(options);
}
