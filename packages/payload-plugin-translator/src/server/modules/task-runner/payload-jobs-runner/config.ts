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
