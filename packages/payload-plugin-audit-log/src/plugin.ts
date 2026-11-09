import type { BaseDatabaseAdapter, CollectionConfig, Config, Payload, Plugin } from "payload";
import { buildAuditCollection } from "./collection/auditCollection";
import { CUSTOM_CONFIG_KEY, DEFAULT_FOLDERS_SLUG } from "./constants";
import { deferAuditWritesToCommit } from "./core/failOpenInsert";
import { captureCollectionWrites } from "./db/captureCollectionWrites";
import { captureMainGlobalReads } from "./db/captureMainGlobalReads";
import { withCollectionAudit } from "./hooks/collectionHooks";
import { buildFailedLoginHook } from "./hooks/failedLoginHook";
import { withGlobalAudit } from "./hooks/globalHooks";
import { normalizeOptions } from "./options";
import type { ResolvedOptions } from "./options";
import { buildPurgeTask } from "./retention/purgeTask";
import type { AuditLogPluginOptions } from "./types";

function auditEach<T extends { slug: string }>(
  configs: T[] | undefined,
  excluded: ReadonlySet<string>,
  withAudit: (config: T) => T
): T[] {
  return (configs ?? []).map((config) => (excluded.has(config.slug) ? config : withAudit(config)));
}

function auditFolders(
  folders: Config["folders"],
  excluded: ReadonlySet<string>,
  withAudit: (collection: CollectionConfig) => CollectionConfig
): Config["folders"] {
  if (folders === false || excluded.has(folders?.slug ?? DEFAULT_FOLDERS_SLUG)) return folders;
  return {
    ...folders,
    collectionOverrides: [
      ...(folders?.collectionOverrides ?? []),
      ({ collection }) => withAudit(collection),
    ],
  };
}

const withPurgeTask = (jobs: Config["jobs"], opts: ResolvedOptions): Config["jobs"] =>
  opts.retention
    ? { ...jobs, tasks: [...(jobs?.tasks ?? []), buildPurgeTask(opts, opts.retention)] }
    : jobs;

type AuditAdapter = (payload: Payload, adapter: BaseDatabaseAdapter) => void;

const auditedWhenCreated = (db: Config["db"], audit: AuditAdapter): Config["db"] => ({
  ...db,
  init: (args) => {
    const adapter = db.init(args);
    audit(args.payload, adapter);
    return adapter;
  },
});

const auditAdapter: AuditAdapter = (payload, adapter) => {
  deferAuditWritesToCommit(payload, adapter);
  captureMainGlobalReads(adapter);
  captureCollectionWrites(payload, adapter);
};

export function auditLogPlugin(options: AuditLogPluginOptions = {}): Plugin {
  return (config: Config): Config => {
    if (options.enabled === false) return config;
    const opts = normalizeOptions(options);

    const withAudit = (collection: CollectionConfig) =>
      withCollectionAudit(collection, opts, config.blocks);
    const collections = auditEach(config.collections, opts.excludedCollections, withAudit);
    const folders = auditFolders(config.folders, opts.excludedCollections, withAudit);
    const globals = auditEach(config.globals, opts.excludedGlobals, (global) =>
      withGlobalAudit(global, opts, config.blocks)
    );
    const auditCollection = buildAuditCollection(opts, {
      adminUserSlug: config.admin?.user ?? "users",
    });
    const jobs = withPurgeTask(config.jobs, opts);

    return {
      ...config,
      db: auditedWhenCreated(config.db, auditAdapter),
      collections: [...collections, auditCollection],
      globals,
      folders,
      custom: {
        ...config.custom,
        [CUSTOM_CONFIG_KEY]: { slug: opts.slug, recordIpAndUserAgent: opts.recordIpAndUserAgent },
      },
      hooks: {
        ...config.hooks,
        afterError: [...(config.hooks?.afterError ?? []), buildFailedLoginHook(opts)],
      },
      ...(jobs ? { jobs } : {}),
    };
  };
}
