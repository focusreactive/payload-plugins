import type { Payload, Where, CollectionSlug } from "payload";

import type { TaskRunner } from "../TaskRunner.interface";
import type { Task, TaskInput, RunResult } from "../types";
import { normalizeJob } from "./normalizeJob";
import type { PayloadJobsRunnerConfig, PayloadJob } from "./types";

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
      const documentIds = items.map((t) => String(t.collectionId));
      const existing = await this.findByCollection(collectionSlug, documentIds);
      if (existing.length > 0) {
        await this.cancelInternal(existing.map((t) => t.id));
      }
    }

    await Promise.all(
      tasks.map((task) =>
        this.payload.jobs.queue({
          input: {
            collection: {
              // Pass `value` through verbatim. The Payload Jobs `input` schema
              // declares this as a `relationship` field, which validates the
              // value's type against the target collection's ID type (number
              // for autoincrement, string for uuid). Coercing to string here
              // would silently fail validation for number-id collections and
              // leave jobs stuck in processing without ever invoking the
              // task handler. `findByCollection` reads back via in-memory
              // filtering and normalizes both sides with String(...) for the
              // comparison, so it does not need write-side normalization.
              relationTo: task.collectionSlug,
              value: task.collectionId,
            },
            publish_on_translation: task.publishOnTranslation,
            source_lng: task.sourceLng,
            strategy: task.strategy,
            target_lng: task.targetLng,
          },
          queue: this.config.queueName,
          task: this.config.taskName,
        })
      )
    );
  }

  async cancel(taskIds: string[]): Promise<void> {
    if (taskIds.length === 0) {return;}
    await this.cancelInternal(taskIds);
  }

  async run(taskId: string): Promise<RunResult> {
    const tasks = await this.findJobsInternal(
      { id: { equals: taskId } },
      { limit: 1 }
    );
    const task = tasks[0];

    if (!task) {
      return { error: "not_found", success: false };
    }
    if (task.completedAt) {
      return { error: "already_completed", success: false };
    }
    if (task.status === "running") {
      return { error: "already_running", success: false };
    }

    this.payload.jobs.runByID({ id: taskId });
    return { success: true };
  }

  /**
   * Find translation jobs for a collection, optionally narrowed by document IDs.
   *
   * IMPORTANT — why we filter `collection.value` in memory instead of in WHERE
   * ------------------------------------------------------------------------
   * The "natural" implementation would be a single `payload.find` with the
   * full where clause:
   *
   *     where: {
   *       and: [
   *         { 'input.collection.relationTo': { equals: collectionSlug } },
   *         { 'input.collection.value':      { in: documentIds } },
   *       ],
   *     }
   *
   * This DOES NOT work on SQLite (and is unreliable on any adapter) because
   * of two compounding bugs in Payload's drizzle layer.
   *
   * 1. The `input` field on `payload-jobs` is declared `type: 'json'`. The
   *    drizzle path resolver (`@payloadcms/drizzle/queries/getTableColumnFromPath`)
   *    has no `case 'json'` branch, so the value is left as a raw column and
   *    the path segments are passed through to `parseParams.js`, which on
   *    SQLite builds raw SQL using `convertPathToJSONTraversal` — generating
   *    expressions like `input->>'collection'->>'value'`.
   *
   * 2. When `parseParams.js` formats the right-hand side of `in`/`not_in`
   *    (and even `equals` when `!isNaN(val)`), it inlines values via JS
   *    template literals WITHOUT wrapping strings in quotes. The string
   *    `'1'` from our WHERE becomes raw `1` in the SQL. Drizzle therefore
   *    emits queries like:
   *
   *        WHERE input->>'collection'->>'value' IN (1)
   *
   *    even though the caller passed `['1']` (an array of strings).
   *
   * On SQLite, `->>` preserves the JSON value's type — if the stored JSON
   * has `"value": "1"` (a JSON string), `->>` returns SQLite TEXT `'1'`;
   * if the JSON has `"value": 1` (a JSON number), `->>` returns INTEGER `1`.
   * SQLite's `IN (...)` does NOT coerce between TEXT and INTEGER. So:
   *
   *     TEXT '1'    IN (1)    → false   (text vs integer, no match)
   *     INTEGER 1   IN ('1')  → false   (integer vs text, no match)
   *
   * Combined with bug #2 above, any value passed by the caller — even if
   * we normalize it to a string on write — gets re-coerced to a number in
   * the generated SQL and never matches the stored JSON.
   *
   * Postgres avoids most of this because `jsonb_path_query` returns text
   * uniformly and PG's type coercion is more permissive, but the same
   * un-quoted-string bug technically affects it too.
   *
   * Why we don't fix it upstream / patch the dep
   * --------------------------------------------
   * - This plugin is published to npm. Consumers install it with their own
   *   Payload version and would not receive any local `bun patch` /
   *   `patch-package` overrides on `@payloadcms/drizzle`. The plugin must
   *   work against vanilla Payload.
   * - A PR to Payload core is the proper long-term fix, but the plugin
   *   cannot block on its merge/release cycle.
   * - Forcing a non-numeric prefix on the stored ID (e.g., `"id:1"`) would
   *   work around bug #2, but bloats the data shape and breaks anything
   *   that reads `input.collection.value` expecting a plain id.
   *
   * Why in-memory filtering is acceptable here
   * ------------------------------------------
   * We narrow the SQL query to `taskSlug + relationTo` (both string
   * equality, which Payload quotes correctly), then filter the result set
   * by `collection.value` in JavaScript. Per-collection job sets are
   * small (typically <100 rows; the plugin actively cancels superseded
   * jobs so they don't accumulate), so a Set-membership check in JS is
   * effectively free.
   *
   * If/when the upstream drizzle bug is fixed (or this plugin gains a
   * mirror collection with indexed flat columns), this method can collapse
   * back to a single SQL query.
   */
  async findByCollection(
    collectionSlug: CollectionSlug,
    documentIds?: (string | number)[]
  ): Promise<Task[]> {
    const tasks = await this.findJobsInternal(
      { "input.collection.relationTo": { equals: collectionSlug } },
      { pagination: false }
    );
    if (!documentIds?.length) {return tasks;}
    const wanted = new Set(documentIds.map(String));
    return tasks.filter((t) => wanted.has(String(t.input.collectionId)));
  }

  /**
   * Group tasks by collection slug
   */
  private groupByCollection(
    tasks: TaskInput[]
  ): Map<CollectionSlug, TaskInput[]> {
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
    if (taskIds.length === 0) {return;}

    await this.payload.jobs.cancel({
      queue: this.config.queueName,
      where: { id: { in: taskIds } },
    });

    await this.payload.delete({
      collection: this.config.jobsCollection,
      where: { id: { in: taskIds } },
    });
  }

  /**
   * Internal method to find jobs with where clause
   */
  private async findJobsInternal(
    where: Where,
    params?: { limit?: number; pagination?: boolean }
  ): Promise<Task[]> {
    const response = await this.payload.find({
      collection: this.config.jobsCollection,
      limit: params?.limit,
      pagination: params?.pagination,
      where: {
        and: [{ taskSlug: { equals: this.config.taskName } }, where],
      },
    });

    return (response.docs as PayloadJob[]).map(normalizeJob);
  }
}
