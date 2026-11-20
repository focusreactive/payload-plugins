import type { PayloadRequest } from "payload";

export interface RelationsGraphOptions {
  /**
   * Who may open the graph and call its endpoints. Default: any logged-in admin user.
   * Collections and globals the user cannot read are left out of the graph either way.
   */
  access?: (args: { req: PayloadRequest }) => boolean | Promise<boolean>;
  /** Set `false` to turn the plugin off without removing it from the config. */
  enabled?: boolean;
  /** Collection or global slugs to leave out of the graph. */
  exclude?: string[];
  /** Show globals as nodes. Default `true`. */
  includeGlobals?: boolean;
  /** Show collections and globals flagged `admin.hidden` (usually plugin internals). Default `false`. */
  includeHidden?: boolean;
  /**
   * Content-model health checks and live data statistics (document counts, relation fill
   * rates) in the graph view. Default `true`.
   */
  insights?: boolean;
  /** Add a "Relations graph" link to the admin nav. Default `true`. */
  navLink?: boolean;
  /** Admin route of the graph view, relative to the admin root. Default `/relations-graph`. */
  path?: `/${string}`;
  /**
   * "Where is this used?" lookups: a control in every document's edit view listing the
   * documents that reference it. `true`/`false` for all collections, or a list of slugs.
   * Default `true`.
   */
  references?: boolean | string[];
}

export interface ResolvedRelationsGraphOptions {
  access: NonNullable<RelationsGraphOptions["access"]>;
  exclude: string[];
  includeGlobals: boolean;
  includeHidden: boolean;
  insights: boolean;
  navLink: boolean;
  path: `/${string}`;
  references: boolean | string[];
}
