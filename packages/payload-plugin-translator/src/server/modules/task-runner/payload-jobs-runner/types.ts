import type { CollectionSlug } from "payload";

export type AutoRunConfig = {
  /** @default '* * * * *' — every minute */
  cron?: string;
  /** Jobs taken per autorun tick. @default 50 */
  limit?: number;
};

export type PayloadJobsRunnerOptions = {
  /** @default 'translate_document' */
  taskName?: string;
  /** @default 'translations' */
  queueName?: string;
  /** @default 'payload-jobs' */
  jobsCollection?: CollectionSlug;
  /**
   * `false` where no cron runs (Vercel and other serverless): jobs then queue and wait for an
   * external driver.
   * @default { cron: '* * * * *', limit: 50 }
   */
  autoRun?: false | AutoRunConfig;
  /**
   * How long (ms) a job may hold `processing: true` before the lock counts as stale and the job may
   * be re-run. MUST exceed the longest a single document translation can legitimately take, or an
   * in-flight job is reclaimed and the document translated twice.
   * @default 300000 (5 minutes)
   */
  staleJobTimeoutMs?: number;
  retries?: {
    attempts?: number;
    backoff?: { delay?: number; type: "exponential" | "fixed" };
  };
};

export type PayloadJobsRunnerConfig = {
  taskName: string;
  workflowName: string;
  queueName: string;
  jobsCollection: CollectionSlug;
  autoRun: false | Required<AutoRunConfig>;
  staleJobTimeoutMs: number;
  retries?: PayloadJobsRunnerOptions["retries"];
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
    collection_slug?: string;
    collection_id?: string;
    /**
     * @deprecated Read-only fallback for jobs queued before the ID-agnostic migration.
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
    requester_id?: string | number | null;
    requester_collection?: string | null;
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
  /**
   * Who asked, replayed at run time so the write is checked against their rights rather than
   * nobody's. `null` keeps the old behaviour of writing with access control off — see
   * {@link RequestScope}.
   */
  requester_id: string | number | null;
  requester_collection: string | null;
};

/** Written by Payload only once a task settles — an absent entry means that locale has not run. */
export type JobLogEntry = {
  state: "succeeded" | "failed";
  completedAt?: string | null;
  input?: { target_lng?: string };
};
