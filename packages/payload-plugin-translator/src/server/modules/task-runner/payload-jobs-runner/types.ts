import type { CollectionSlug, Payload } from "payload";

import type { RunResult } from "../types";

/**
 * Configuration for automatic job processing.
 */
export type AutoRunConfig = {
  /**
   * Cron schedule for auto-running jobs.
   * @default '* * * * *' (every minute)
   */
  cron?: string;
  /**
   * Maximum number of jobs to process per run.
   * @default 50
   */
  limit?: number;
};

/**
 * Options for PayloadJobsRunnerProvider
 */
export type PayloadJobsRunnerOptions = {
  /**
   * Name of the Payload task.
   * @default 'translate_document'
   */
  taskName?: string;
  /**
   * Name of the job queue.
   * @default 'translations'
   */
  queueName?: string;
  /**
   * Name of the Payload jobs collection.
   * @default 'payload-jobs'
   */
  jobsCollection?: CollectionSlug;
  /**
   * Automatic job processing configuration.
   * Set to `false` to disable (for Vercel/serverless deployments).
   * Set to an object to customize cron schedule and limit.
   * @default { cron: '* * * * *', limit: 50 }
   */
  autoRun?: false | AutoRunConfig;
  /**
   * How long (ms) a job may stay `processing: true` before its lock is
   * considered stale and the job becomes eligible to be re-run.
   *
   * A process killed mid-run (deploy, crash, request timeout) leaves a job
   * stuck at `processing: true`; the autorun picker only takes
   * `processing: false`, so without recovery such a job would hang forever.
   * On boot the runner resets stale locks, and manual `run()` will re-claim a
   * stale-locked job instead of refusing it as already-running.
   *
   * MUST be larger than the longest a single document translation can
   * legitimately take, otherwise a genuinely in-flight job could be reclaimed
   * and run twice (safe under the idempotent `overwrite` strategy, but wasteful).
   * @default 300000 (5 minutes)
   */
  staleJobTimeoutMs?: number;
  /**
   * Retry configuration for failed jobs.
   */
  retries?: {
    attempts?: number;
    backoff?: { delay?: number; type: "exponential" | "fixed" };
  };
  /**
   * Fired right after a job is queued or its locale list is extended, with the same id `run(jobId)`
   * accepts. The normal host lets the `autoRun` cron pick the job up later; a host whose cron never
   * fires — a Vercel preview deployment, where crons only run in production — can use this to trigger
   * the run itself immediately, e.g. from Next.js `after()` or `waitUntil()`, instead of an HTTP
   * self-call to `POST {basePath}/run/:id`. The `run` argument calls the same in-process run path
   * that endpoint uses, so no self-call or auth token is needed.
   *
   * Called liberally — once for every live job a request touches, whether or not that job actually
   * gained new locales — because `run()` is cheap and safe to call on a job already running or
   * completed (it reports `already_running` / `already_completed` and does nothing), while skipping a
   * call could leave a translation queued forever with no cron to pick it up.
   *
   * Best-effort only up to the point this returns: a throwing/rejecting callback is logged and
   * swallowed, and never fails or delays the enqueue, which has already committed. If the host defers
   * `run()` past that point (e.g. inside Next's `after()`), errors from it are the host's own to
   * catch and log — this hook cannot see them.
   * @since 0.14.0
   */
  onEnqueued?: (
    payload: Payload,
    jobId: string,
    run: () => Promise<RunResult>
  ) => void | Promise<void>;
};

/**
 * Internal configuration for PayloadJobsRunner
 */
export type PayloadJobsRunnerConfig = {
  taskName: string;
  /** Derived from `taskName`; deliberately not a plugin option. */
  workflowName: string;
  queueName: string;
  jobsCollection: CollectionSlug;
  autoRun: false | Required<AutoRunConfig>;
  staleJobTimeoutMs: number;
  retries?: PayloadJobsRunnerOptions["retries"];
  onEnqueued?: PayloadJobsRunnerOptions["onEnqueued"];
};

export type PayloadJob = {
  log?: JobLogEntry[];
  id: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  error?: unknown;
  processing?: boolean | null;
  waitUntil?: string | null;
  input?: {
    /** Document reference (flat text, ID-agnostic). Current shape. */
    collection_slug?: string;
    collection_id?: string;
    /**
     * @deprecated Legacy relationship shape, read-only fallback for jobs queued
     * before the ID-agnostic migration. Removed in next major.
     * See docs/DEPRECATIONS.md#jobs-input-collection-field
     */
    collection?: {
      relationTo: CollectionSlug;
      value: string | number;
    };
    source_lng?: string;
    target_lng?: string;
    target_lngs?: string[];
    strategy?: string;
    publish_on_translation?: boolean;
  };
};

/** Snake_case because Payload persists these keys verbatim in the job row. */
export type StoredWorkflowInput = {
  collection_slug: CollectionSlug;
  collection_id: string;
  source_lng: string;
  target_lngs: string[];
  strategy: string;
  publish_on_translation: boolean;
};

/** Written by Payload only once a task settles — an absent entry means that locale has not run. */
export type JobLogEntry = {
  state: "succeeded" | "failed";
  completedAt?: string | null;
  input?: { target_lng?: string };
};
