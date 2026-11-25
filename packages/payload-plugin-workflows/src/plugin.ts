import type {
  Access,
  Config,
  Field,
  Payload,
  PayloadRequest,
  Plugin,
  TypedUser,
  WidgetInstance,
} from "payload";

import { JOBS_QUEUE, WIDGET_SLUG, componentPath } from "./constants.js";
import { activitiesWithPaths, defineWorkflow, definitionIssues, formatIssues } from "./define.js";
import { workflowEndpoints } from "./endpoints.js";
import { hasDrafts, withWorkflowHooks } from "./hooks.js";
import { effectTask, tickTask } from "./server/effects.js";
import { eventsCollection } from "./server/events.js";
import { RUN_COLUMNS, runsCollection } from "./server/store.js";
import { NAMESPACE, en } from "./translations.js";
import type { InstanceView, Patch, QueuedEffect, WorkflowDefinition } from "./types.js";

// ---- Options --------------------------------------------------------------------------------

export interface EffectHandlerArgs {
  payload: Payload;
  req: PayloadRequest;
  /** The run as the system sees it, with `id` and `subject`. */
  instance: InstanceView;
  /** The subject document (latest draft), or `null` when it is gone. */
  doc: Record<string, unknown> | null;
  effect: QueuedEffect;
}

/**
 * Runs after the change that queued it is committed, as a Payload job (retried on throw). Return
 * `{ set }` to write workflow fields and move the run: how an async step reports back.
 */
export type EffectHandler = (
  args: EffectHandlerArgs
) => Promise<void | { set?: Patch }> | void | { set?: Patch };

export interface WorkflowAccessArgs {
  req: PayloadRequest;
  /** Who is asking: the `user` passed to the operation, not necessarily `req.user`. */
  user: TypedUser;
  workflow: WorkflowDefinition;
  /** The subject document's collection and id. */
  collection: string;
  id: string;
  /** The subject document (latest draft), read with `user`'s access. */
  doc: Record<string, unknown> | null;
  /** The run's current stage (`fire`, `abort`). */
  stage?: string;
  /** The activity the action is fired on, when named or the stage's only one (`fire`). */
  activity?: string;
  /** The action being fired (`fire`). */
  action?: string;
  /** The run (`fire`, `abort`): its id and fields. */
  run?: { id: string; fields: Record<string, unknown> };
}

export type WorkflowAccess = (args: WorkflowAccessArgs) => boolean | Promise<boolean>;

/**
 * Which facts about a document decide who may see its workflows, kept on its runs, and the rule
 * over them. Configure it when subject collections have per-document read rules on many documents
 * (multi-tenancy): visibility is then one ordinary access rule, with no per-document resolution.
 */
export interface WorkflowVisibility {
  /**
   * Payload fields added to the runs collection (e.g. a `tenant` relationship), read-only. Each needs
   * a name, and no name of the plugin's own columns.
   */
  fields: Field[];
  /**
   * Their values for a document: synchronous and pure. Gets the document as conditions do (latest
   * draft, default locale); a relationship populated in it is stored as its id. Missing keys are
   * stored as `null`.
   */
  fromDocument: (args: {
    doc: Record<string, unknown>;
    collection: string;
    req: PayloadRequest;
  }) => Record<string, unknown>;
  /**
   * Who may see a workflow: a normal Payload access function over those fields (`true`, `false`
   * or a query on them), for users of the admin user collection. Applied to runs as is and to
   * their events through `run` (`tenant` there reads `run.tenant`).
   */
  read: Access;
}

export interface WorkflowsPluginOptions {
  /**
   * Default `true`. `false` keeps the runs collection (its data and schema) and the job tasks (so
   * queued effects still run), and leaves out everything else: hooks, guards, endpoints, admin
   * components and the dashboard widget.
   */
  enabled?: boolean;
  workflows: WorkflowDefinition[];
  effects?: Record<string, EffectHandler>;
  /** Roles of a user. Default: `user.roles` (array) or `user.role` (string), else none. */
  roles?: (user: TypedUser) => string[];
  /**
   * Who may start a run, fire an action or abort a run. Only `true` allows. Default: everyone who
   * takes part. Only users of the admin user collection (`admin.user`) take part, whatever these
   * return: they narrow, never widen. The document is always read with the user's access first,
   * so someone who cannot read it is refused before these run. `fire` also gets the stage,
   * activity, action and run (`{ id, fields }`); `abort` the stage and run.
   */
  access?: { start?: WorkflowAccess; fire?: WorkflowAccess; abort?: WorkflowAccess };
  /** Default `true`: the "Workflows" dashboard widget, first on the default dashboard. */
  dashboard?: boolean;
  /**
   * Who sees which workflows, decided by facts kept on the runs (see `WorkflowVisibility`).
   * Without it, a run is visible to whoever may read its document, resolved per request to at
   * most 5,000 documents per collection.
   */
  visibility?: WorkflowVisibility;
}

/** The options as the server reads them back (`config.custom.workflows`), defaults filled in. */
export type WorkflowsSettings = Required<
  Omit<WorkflowsPluginOptions, "enabled" | "dashboard" | "visibility">
> &
  Pick<WorkflowsPluginOptions, "visibility">;

const defaultRoles = (user: TypedUser): string[] => {
  const record = user as unknown as Record<string, unknown>;
  if (Array.isArray(record.roles)) {
    return record.roles.filter((role): role is string => typeof role === "string");
  }
  return typeof record.role === "string" && record.role ? [record.role] : [];
};

// ---- Checks against the config --------------------------------------------------------------

/** The `visibility` option: named fields that do not collide with the runs' own columns. */
const visibilityIssues = (visibility: WorkflowVisibility | undefined): string[] => {
  if (visibility === undefined) {
    return [];
  }
  const issues: string[] = [];
  if (typeof visibility.fromDocument !== "function") {
    issues.push("visibility.fromDocument: must be a function ({ doc, collection, req }) => values");
  }
  if (typeof visibility.read !== "function") {
    issues.push("visibility.read: must be an access function ({ req }) => boolean | Where");
  }
  const fields = Array.isArray(visibility.fields) ? visibility.fields : [];
  if (fields.length === 0) {
    issues.push("visibility.fields: at least one field is required");
  }
  const seen = new Set<string>();
  fields.forEach((field, i) => {
    const name = "name" in field ? field.name : undefined;
    if (typeof name !== "string" || name.length === 0) {
      issues.push(
        `visibility.fields[${i}]: needs a name (layout fields such as rows and tabs are not supported)`
      );
    } else if (RUN_COLUMNS.includes(name)) {
      issues.push(
        `visibility.fields[${i}].name: "${name}" is a column of the plugin's runs collection; choose another name`
      );
    } else if (seen.has(name)) {
      issues.push(`visibility.fields[${i}].name: duplicate field name "${name}"`);
    }
    if (typeof name === "string") {
      seen.add(name);
    }
  });
  return issues;
};

/** Every problem with the options against the config, in one list. */
const optionIssues = (options: WorkflowsPluginOptions, config: Config): string[] => {
  const issues: string[] = [];
  const collections = config.collections ?? [];
  const effects = options.effects ?? {};
  const seen = new Set<string>();
  options.workflows.forEach((def, i) => {
    const path = `workflows[${i}]`;
    issues.push(...definitionIssues(def).map((issue) => `${path}.${issue}`));
    if (seen.has(def.name)) {
      issues.push(`${path}.name: duplicate workflow name "${def.name}"`);
    }
    seen.add(def.name);
    const slugs = def.collections ?? [];
    slugs.forEach((slug, c) => {
      if (!collections.some((collection) => collection.slug === slug)) {
        issues.push(`${path}.collections[${c}]: collection "${slug}" is not in the config`);
      }
    });
    // A `publish` guard needs drafts: without them every save writes the live document.
    const draftless = slugs.filter((slug) => {
      const collection = collections.find((entry) => entry.slug === slug);
      return collection && !hasDrafts(collection);
    });
    if (def.requiredToPublish === true) {
      for (const slug of draftless) {
        issues.push(
          `${path}.requiredToPublish: workflow "${def.name}" is required to publish, but collection "${slug}" has no drafts (versions.drafts), so it has no publish to require it for. Enable drafts on "${slug}" or leave \`requiredToPublish\` out`
        );
      }
    }
    (def.stages ?? []).forEach((stage, s) => {
      (stage.guards ?? []).forEach((guard, g) => {
        if (!(guard.operations ?? []).includes("publish")) {
          return;
        }
        for (const slug of draftless) {
          issues.push(
            `${path}.stages[${s}].guards[${g}]: workflow "${def.name}" stage "${stage.name}" guard "${guard.name}" holds "publish", but collection "${slug}" has no drafts (versions.drafts), so it has no publish to hold. Enable drafts on "${slug}" or guard "update" instead`
          );
        }
      });
      for (const entry of activitiesWithPaths(stage, `${path}.stages[${s}]`)) {
        (entry.activity.actions ?? []).forEach((action, k) =>
          (action.effects ?? []).forEach((name, e) => {
            if (!effects[name]) {
              issues.push(
                `${entry.path}.actions[${k}].effects[${e}]: no handler is registered for effect "${name}"`
              );
            }
          })
        );
      }
    });
  });
  issues.push(...visibilityIssues(options.visibility));
  return issues;
};

/**
 * Logs once at init when effects would wait for a jobs runner that is not configured: they run
 * inline only when the change that queued them owns its commit.
 */
export const warnWithoutRunner = async (
  payload: Payload,
  workflows: WorkflowDefinition[]
): Promise<void> => {
  const effects = new Set(
    workflows.flatMap((def) =>
      def.stages.flatMap((stage) =>
        (stage.activities ?? []).flatMap((activity) =>
          activity.actions.flatMap((action) => action.effects ?? [])
        )
      )
    )
  );
  if (effects.size === 0) {
    return;
  }
  const autoRun = payload.config.jobs?.autoRun;
  const entries = typeof autoRun === "function" ? await autoRun(payload) : (autoRun ?? []);
  if (entries.some((entry) => entry.allQueues === true || entry.queue === JOBS_QUEUE)) {
    return;
  }
  payload.logger.warn(
    `workflows: no jobs runner covers the "${JOBS_QUEUE}" queue, so effects (${[...effects].map((name) => `"${name}"`).join(", ")}) queued while a transaction is open — by a document save that settles a run or auto-starts one (with database transactions on), or by a Local API call given a \`req\` that carries a transaction — and effects that failed inline and wait for a retry will wait until something runs it. Add \`jobs: { autoRun: [{ queue: "${JOBS_QUEUE}", cron: "* * * * *" }] }\` to your Payload config, or run that queue another way (e.g. the jobs run endpoint from a cron).`
  );
};

// ---- The plugin -----------------------------------------------------------------------------

type Dashboard = NonNullable<NonNullable<Config["admin"]>["dashboard"]>;
type Layout = NonNullable<Dashboard["defaultLayout"]>;

/**
 * The host's dashboard plus the widget. The widget joins the default layout: first, at full
 * width, before Payload's own "collections" widget when the host has no layout; after the host's
 * widgets when it has one (an array, or a function, which is wrapped). Users who saved their own
 * layout add it from the dashboard's edit mode.
 */
export const withWidget = (dashboard: Dashboard | undefined): Dashboard => {
  const ours = { widgetSlug: WIDGET_SLUG, width: "full" as const };
  const add = (layout: WidgetInstance[]): WidgetInstance[] =>
    layout.some((entry) => entry.widgetSlug === WIDGET_SLUG) ? layout : [...layout, ours];
  const layout = dashboard?.defaultLayout;
  let defaultLayout: Layout;
  if (layout === undefined) {
    // What Payload uses when there is none (`collections`, full width), with ours first.
    defaultLayout = [ours, { widgetSlug: "collections", width: "full" }];
  } else if (typeof layout === "function") {
    defaultLayout = async (args) => add(await layout(args));
  } else {
    defaultLayout = add(layout);
  }
  return {
    ...dashboard,
    widgets: [
      ...(dashboard?.widgets ?? []),
      {
        slug: WIDGET_SLUG,
        Component: componentPath("rsc", "WorkflowsWidget"),
        label: ({ t }) => (t as (key: string) => string)(`${NAMESPACE}:widgetTitle`),
        minWidth: "medium",
      },
    ],
    defaultLayout,
  };
};

/**
 * Adds to each collection a workflow runs on: the indicator beside Save / Publish (it opens the
 * drawer) and the hooks (guards, auto-start, settle on save, abort on delete). Adds the runs
 * collection (the "Workflows" list in the admin) with the endpoints, the events collection (each
 * run's history), the effect and tick jobs, the dashboard widget and the admin strings. Disabled,
 * only the two collections and the jobs.
 */
export const workflowsPlugin =
  (options: WorkflowsPluginOptions): Plugin =>
  (config: Config): Config => {
    const enabled = options.enabled !== false;
    if (enabled) {
      const issues = optionIssues(options, config);
      if (issues.length > 0) {
        throw new Error(formatIssues("workflowsPlugin()", issues));
      }
    }
    const settings: WorkflowsSettings = {
      workflows: options.workflows.map(defineWorkflow),
      effects: options.effects ?? {},
      roles: options.roles ?? defaultRoles,
      access: options.access ?? {},
      ...(options.visibility ? { visibility: options.visibility } : {}),
    };
    const subjects = new Set(enabled ? settings.workflows.flatMap((def) => def.collections) : []);
    const translations = (config.i18n?.translations ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
    const visibilityFields = options.visibility?.fields ?? [];
    const runs = enabled
      ? runsCollection({ components: true, endpoints: workflowEndpoints(), visibilityFields })
      : runsCollection({ components: false, visibilityFields });
    return {
      ...config,
      collections: [
        ...(config.collections ?? []).map((collection) => {
          if (!subjects.has(collection.slug)) {
            return collection;
          }
          const edit = collection.admin?.components?.edit;
          return withWorkflowHooks({
            ...collection,
            admin: {
              ...collection.admin,
              components: {
                ...collection.admin?.components,
                edit: {
                  ...edit,
                  beforeDocumentControls: [
                    ...(edit?.beforeDocumentControls ?? []),
                    componentPath("client", "WorkflowIndicator"),
                  ],
                },
              },
            },
          });
        }),
        runs,
        eventsCollection(),
      ],
      // English strings for every locale, under the host's own translations of them.
      i18n: {
        ...config.i18n,
        translations: Object.fromEntries(
          [...new Set(["en", ...Object.keys(translations)])].map((locale) => {
            const current = translations[locale] ?? {};
            const own = (current[NAMESPACE] as object | undefined) ?? {};
            return [locale, { ...current, [NAMESPACE]: { ...en, ...own } }];
          })
        ) as NonNullable<Config["i18n"]>["translations"],
      },
      jobs: {
        ...config.jobs,
        tasks: [
          ...(config.jobs?.tasks ?? []),
          effectTask(config.jobs?.enableConcurrencyControl === true),
          tickTask,
        ],
      },
      ...(options.dashboard === false || !enabled
        ? {}
        : { admin: { ...config.admin, dashboard: withWidget(config.admin?.dashboard) } }),
      custom: { ...config.custom, workflows: settings },
      onInit: async (payload) => {
        await config.onInit?.(payload);
        if (enabled) {
          await warnWithoutRunner(payload, settings.workflows);
        }
      },
    };
  };
