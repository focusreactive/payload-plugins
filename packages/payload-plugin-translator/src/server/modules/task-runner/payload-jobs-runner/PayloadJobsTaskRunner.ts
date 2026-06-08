import type { Payload, Where, CollectionSlug } from "payload";

import type { TaskRunner } from "../TaskRunner.interface";
import type { Task, TaskInput, RunResult } from "../types";
import type { PayloadJobsRunnerConfig, PayloadJob } from "./types";
import { normalizeJob } from "./normalizeJob";

/**
 * TaskRunner implementation using Payload Jobs.
 *
 * Handles queuing, cancellation, status tracking, and execution of translation tasks.
 */
export class PayloadJobsTaskRunner implements TaskRunner {
  constructor(
    private readonly payload: Payload,
    private readonly config: PayloadJobsRunnerConfig
  ) {}

  async enqueue(tasks: TaskInput[]): Promise<void> {
    const byCollection = this.groupByCollection(tasks);

    for (const [collectionSlug, items] of byCollection) {
      const documentIds = items.map((t) => t.collectionId);
      const existing = await this.findByCollection(collectionSlug, documentIds);
      if (existing.length > 0) {
        await this.cancelInternal(existing.map((t) => t.id));
      }
    }

    await Promise.all(
      tasks.map((task) =>
        this.payload.jobs.queue({
          task: this.config.taskName,
          queue: this.config.queueName,
          input: {
            // Flat text reference (ID-agnostic). Stored as a string — no
            // relationship type validation against the collection's ID type,
            // which is what previously left number-id jobs stuck in processing.
            // This is the single write boundary, so `String(...)` here is the
            // one place IDs are normalized for storage.
            collection_slug: task.collectionSlug,
            collection_id: String(task.collectionId),
            source_lng: task.sourceLng,
            target_lng: task.targetLng,
            strategy: task.strategy,
            publish_on_translation: task.publishOnTranslation,
          },
        })
      )
    );
  }

  async cancel(taskIds: string[]): Promise<void> {
    if (taskIds.length === 0) return;
    await this.cancelInternal(taskIds);
  }

  async run(taskId: string): Promise<RunResult> {
    const tasks = await this.findJobsInternal({ id: { equals: taskId } }, { limit: 1 });
    const task = tasks[0];

    if (!task) {
      return { success: false, error: "not_found" };
    }
    if (task.completedAt) {
      return { success: false, error: "already_completed" };
    }
    if (task.status === "running") {
      return { success: false, error: "already_running" };
    }

    this.payload.jobs.runByID({ id: taskId });
    return { success: true };
  }

  /**
   * Find translation jobs for a collection, optionally narrowed by document IDs.
   *
   * Narrowing is by `taskSlug` only in SQL; the collection slug and document
   * IDs are matched in memory (via the normalized `Task`, which reads both the
   * current flat-text shape and the legacy relationship shape). This is the
   * one path that must transparently span both stored shapes during the
   * ID-agnostic migration — see docs/DEPRECATIONS.md#jobs-input-collection-field.
   *
   * IMPORTANT — why slug/id are matched in memory, not in the SQL WHERE
   * ------------------------------------------------------------------------
   * The "natural" implementation would push `input.collection_id` into the
   * where clause. This DOES NOT work on SQLite (and is unreliable on any
   * adapter) because of two compounding bugs in Payload's drizzle layer.
   *
   * 1. The `input` field on `payload-jobs` is declared `type: 'json'`. The
   *    drizzle path resolver (`@payloadcms/drizzle/queries/getTableColumnFromPath`)
   *    has no `case 'json'` branch, so the value is left as a raw column and
   *    the path segments are passed through to `parseParams.js`, which on
   *    SQLite builds raw SQL using `convertPathToJSONTraversal` — generating
   *    expressions like `input->>'collection_id'`.
   *
   * 2. When `parseParams.js` formats the right-hand side of `in`/`not_in`
   *    (and even `equals` when `!isNaN(val)`), it inlines values via JS
   *    template literals WITHOUT wrapping strings in quotes. The string
   *    `'1'` from our WHERE becomes raw `1` in the SQL. Drizzle therefore
   *    emits queries like `WHERE input->>'collection_id' IN (1)` even though
   *    the caller passed `['1']` (an array of strings).
   *
   * On SQLite, `->>` preserves the JSON value's type and `IN (...)` does NOT
   * coerce between TEXT and INTEGER, so a numeric-looking string id never
   * matches once bug #2 strips its quotes. Storing the id as text (this
   * migration) does not fix the SQL path — drizzle re-numbers it anyway — so
   * we keep matching in memory.
   *
   * Why in-memory filtering is acceptable here
   * ------------------------------------------
   * Per-task job sets are small (typically <100 rows; the plugin actively
   * cancels superseded jobs so they don't accumulate), so the JS filtering
   * is effectively free. If/when the upstream drizzle bug is fixed, this can
   * collapse back to a single SQL query.
   */
  async findByCollection(collectionSlug: CollectionSlug, documentIds?: Array<string | number>): Promise<Task[]> {
    const all = await this.findJobsInternal(undefined, { pagination: false });
    const bySlug = all.filter((t) => t.input.collectionSlug === collectionSlug);
    if (!documentIds?.length) return bySlug;
    // `documentIds` is the public `Array<string | number>` param, so normalize
    // it here; `t.input.collectionId` is already `ID` (string) via normalizeJob.
    const wanted = new Set(documentIds.map(String));
    return bySlug.filter((t) => wanted.has(t.input.collectionId));
  }

  /**
   * Group tasks by collection slug
   */
  private groupByCollection(tasks: TaskInput[]): Map<CollectionSlug, TaskInput[]> {
    const map = new Map<CollectionSlug, TaskInput[]>();
    for (const task of tasks) {
      const existing = map.get(task.collectionSlug) ?? [];
      existing.push(task);
      map.set(task.collectionSlug, existing);
    }
    return map;
  }

  /**
   * Internal cancel implementation
   */
  private async cancelInternal(taskIds: string[]): Promise<void> {
    if (taskIds.length === 0) return;

    await this.payload.jobs.cancel({
      where: { id: { in: taskIds } },
      queue: this.config.queueName,
    });

    await this.payload.delete({
      collection: this.config.jobsCollection,
      where: { id: { in: taskIds } },
    });
  }

  /**
   * Internal method to find jobs with where clause
   */
  private async findJobsInternal(where?: Where, params?: { limit?: number; pagination?: boolean }): Promise<Task[]> {
    const and: Where[] = [{ taskSlug: { equals: this.config.taskName } }];
    if (where) and.push(where);

    const response = await this.payload.find({
      collection: this.config.jobsCollection,
      limit: params?.limit,
      pagination: params?.pagination,
      where: { and },
    });

    return (response.docs as PayloadJob[]).map(normalizeJob);
  }
}
