import type { Access, PayloadRequest } from "payload";

export type ReleaseStatus =
  | "draft"
  | "scheduled"
  | "publishing"
  | "published"
  | "reverting"
  | "reverted"
  | "failed"
  | "cancelled";

export type ReleaseItemAction = "publish" | "unpublish";

export type ReleaseItemStatus = "pending" | "published" | "failed" | "skipped";

export type ConflictStrategy = "fail" | "force";

export interface ContentReleasesPluginConfig {
  enabledCollections: string[];
  conflictStrategy?: ConflictStrategy;
  publishBatchSize?: number;
  useTransactions?: boolean;
  schedulerSecret?: string;

  /** Interval in milliseconds for checking scheduled releases.
   * Set to 0 or false to disable the built-in scheduler.
   * @default 60000 (1 minute)
   */
  schedulerInterval?: number | false;
  access?: {
    releases?: {
      create?: Access;
      read?: Access;
      update?: Access;
      delete?: Access;
    };
    releaseItems?: {
      create?: Access;
      read?: Access;
      update?: Access;
      delete?: Access;
    };
  };
  hooks?: {
    afterPublish?: (args: {
      releaseId: string;
      req: PayloadRequest;
    }) => void | Promise<void>;
    onPublishError?: (args: {
      releaseId: string;
      errors: Array<{ collection: string; docId: string; error: string }>;
      req: PayloadRequest;
    }) => void | Promise<void>;
    afterRollback?: (args: {
      releaseId: string;
      req: PayloadRequest;
    }) => void | Promise<void>;
    onRollbackError?: (args: {
      releaseId: string;
      errors: Array<{
        collection: string;
        docId: string;
        error: string;
      }>;
      req: PayloadRequest;
    }) => void | Promise<void>;
  };
}
