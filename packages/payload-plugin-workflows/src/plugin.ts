import type { Config, Payload, PayloadRequest, Plugin, TypedUser } from "payload";

import { JOBS_QUEUE, VIEW_PATH } from "./constants.js";
import { activitiesWithPaths, defineWorkflow, definitionIssues, formatIssues } from "./define.js";
import { workflowEndpoints } from "./endpoints.js";
import { hasDrafts, withWorkflowHooks } from "./hooks.js";
import { effectTask, tickTask } from "./server/effects.js";
import { runsCollection } from "./server/store.js";
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
}

export type WorkflowAccess = (args: WorkflowAccessArgs) => boolean | Promise<boolean>;

export interface WorkflowsPluginOptions {
  /** Default `true`. */
  enabled?: boolean;
  workflows: WorkflowDefinition[];
  effects?: Record<string, EffectHandler>;
  /** Roles of a user. Default: `user.roles` (array) or `user.role` (string), else none. */
  roles?: (user: TypedUser) => string[];
  /**
   * Who may start a run, fire an action or abort a run. Only `true` allows. Default: a user of the
   * admin user collection (`admin.user`). The document is always read with the user's access
   * first, so someone who cannot read it is refused before these run.
   */
  access?: { start?: WorkflowAccess; fire?: WorkflowAccess; abort?: WorkflowAccess };
}

/** The options as the server reads them back (`config.custom.workflows`), defaults filled in. */
export type WorkflowsSettings = Required<Omit<WorkflowsPluginOptions, "enabled">>;

const defaultRoles = (user: TypedUser): string[] => {
  const record = user as unknown as Record<string, unknown>;
  if (Array.isArray(record.roles)) {
    return record.roles.filter((role): role is string => typeof role === "string");
  }
  return typeof record.role === "string" && record.role ? [record.role] : [];
};

// ---- Checks against the config --------------------------------------------------------------

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

const component = (entry: "client" | "rsc", name: string) =>
  `@focus-reactive/payload-plugin-workflows/${entry}#${name}`;

/**
 * Adds to each collection a workflow runs on: the indicator beside Save / Publish (it opens the
 * drawer) and the hooks (guards, auto-start, settle on save, abort on delete). Adds the runs
 * collection, the endpoints, the effect and tick jobs, the workflows view and its nav link, and the
 * admin strings.
 */
export const workflowsPlugin =
  (options: WorkflowsPluginOptions): Plugin =>
  (config: Config): Config => {
    if (options.enabled === false) {
      return config;
    }
    const issues = optionIssues(options, config);
    if (issues.length > 0) {
      throw new Error(formatIssues("workflowsPlugin()", issues));
    }
    const settings: WorkflowsSettings = {
      workflows: options.workflows.map(defineWorkflow),
      effects: options.effects ?? {},
      roles: options.roles ?? defaultRoles,
      access: options.access ?? {},
    };
    const subjects = new Set(settings.workflows.flatMap((def) => def.collections));
    const translations = (config.i18n?.translations ?? {}) as Record<
      string,
      Record<string, unknown>
    >;
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
                    component("client", "WorkflowIndicator"),
                  ],
                },
              },
            },
          });
        }),
        runsCollection,
      ],
      endpoints: [...(config.endpoints ?? []), ...workflowEndpoints()],
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
      jobs: { ...config.jobs, tasks: [...(config.jobs?.tasks ?? []), effectTask, tickTask] },
      admin: {
        ...config.admin,
        components: {
          ...config.admin?.components,
          afterNavLinks: [
            ...(config.admin?.components?.afterNavLinks ?? []),
            component("client", "WorkflowsNavLink"),
          ],
          views: {
            ...config.admin?.components?.views,
            workflows: {
              Component: component("rsc", "WorkflowsViewServer"),
              path: VIEW_PATH,
              exact: true,
            },
          },
        },
      },
      custom: { ...config.custom, workflows: settings },
      onInit: async (payload) => {
        await config.onInit?.(payload);
        await warnWithoutRunner(payload, settings.workflows);
      },
    };
  };
