import type { BaseDatabaseAdapter, CollectionConfig, Config, Payload, Plugin } from "payload";
import { buildAuditCollection } from "./collection/auditCollection";
import { CUSTOM_CONFIG_KEY, DEFAULT_FOLDERS_SLUG } from "./constants";
import { deferAuditWritesToCommit } from "./core/failOpenInsert";
import { auditMigrations } from "./db/auditMigrations";
import { captureCollectionWrites } from "./db/captureCollectionWrites";
import { captureMainGlobalReads } from "./db/captureMainGlobalReads";
import { wrapDbAdapter } from "./db/wrapDbAdapter";
import type { WrapDbScope } from "./db/wrapDbAdapter";
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
): { configs: T[]; auditedSlugs: Set<string> } {
  const auditedSlugs = new Set<string>();
  const audited = (configs ?? []).map((config) => {
    if (excluded.has(config.slug)) return config;
    auditedSlugs.add(config.slug);
    return withAudit(config);
  });
  return { configs: audited, auditedSlugs };
}

function auditFolders(
  folders: Config["folders"],
  excluded: ReadonlySet<string>,
  withAudit: (collection: CollectionConfig) => CollectionConfig
): { folders: Config["folders"]; auditedSlugs: Set<string> } {
  const unaudited = { folders, auditedSlugs: new Set<string>() };
  if (folders === false) return unaudited;
  const slug = folders?.slug ?? DEFAULT_FOLDERS_SLUG;
  if (excluded.has(slug)) return unaudited;
  return {
    folders: {
      ...folders,
      collectionOverrides: [
        ...(folders?.collectionOverrides ?? []),
        ({ collection }) => withAudit(collection),
      ],
    },
    auditedSlugs: new Set([slug]),
  };
}

const withPurgeTask = (jobs: Config["jobs"], opts: ResolvedOptions): Config["jobs"] =>
  opts.retention
    ? { ...jobs, tasks: [...(jobs?.tasks ?? []), buildPurgeTask(opts.slug, opts.retention)] }
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

const auditAdapter =
  (opts: ResolvedOptions, scope: WrapDbScope): AuditAdapter =>
  (payload, adapter) => {
    deferAuditWritesToCommit(payload, adapter);
    auditMigrations(payload, opts, adapter);
    captureMainGlobalReads(adapter);
    captureCollectionWrites(payload, adapter);
    wrapDbAdapter(payload, opts, scope, adapter);
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

    const scope = {
      collections: new Set([...collections.auditedSlugs, ...folders.auditedSlugs]),
      globals: globals.auditedSlugs,
    };

    return {
      ...config,
      db: auditedWhenCreated(config.db, auditAdapter(opts, scope)),
      collections: [...collections.configs, auditCollection],
      globals: globals.configs,
      folders: folders.folders,
      custom: {
        ...config.custom,
        [CUSTOM_CONFIG_KEY]: { slug: opts.slug },
      },
      hooks: {
        ...config.hooks,
        afterError: [...(config.hooks?.afterError ?? []), buildFailedLoginHook(opts)],
      },
      ...(jobs ? { jobs } : {}),
    };
  };
}
