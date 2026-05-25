import type { CollectionSlug } from "payload";

/**
 * Configuration for automatic job processing.
 */
export interface AutoRunConfig {
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
}

/**
 * Options for PayloadJobsRunnerProvider
 */
export interface PayloadJobsRunnerOptions {
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
  jobsCollection?: string;
  /**
   * Automatic job processing configuration.
   * Set to `false` to disable (for Vercel/serverless deployments).
   * Set to an object to customize cron schedule and limit.
   * @default { cron: '* * * * *', limit: 50 }
   */
  autoRun?: false | AutoRunConfig;
  /**
   * Retry configuration for failed jobs.
   */
  retries?: {
    attempts?: number;
    backoff?: { delay?: number; type: "exponential" | "fixed" };
  };
}

/**
 * Internal configuration for PayloadJobsRunner
 */
export interface PayloadJobsRunnerConfig {
  taskName: string;
  queueName: string;
  jobsCollection: string;
  autoRun: false | Required<AutoRunConfig>;
  retries?: PayloadJobsRunnerOptions["retries"];
}

/**
 * Raw Payload job structure
 */
export interface PayloadJob {
  id: string;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  error?: unknown;
  processing?: boolean | null;
  input?: {
    collection?: {
      relationTo: CollectionSlug;
      value: string | number;
    };
    source_lng?: string;
    target_lng?: string;
    strategy?: string;
    publish_on_translation?: boolean;
  };
}
