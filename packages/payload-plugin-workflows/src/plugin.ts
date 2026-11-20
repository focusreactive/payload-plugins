import type { CollectionConfig, Config, Field, Payload, Plugin } from "payload";

import { instancesCollection } from "./collection.js";
import { workflowEndpoints } from "./endpoints.js";
import { withWorkflowHooks } from "./hooks.js";
import {
  DEFAULT_INSTANCES_SLUG,
  ENDPOINT_PREFIX,
  JOBS_QUEUE,
  NAV_LINK_COMPONENT,
  PANEL_COMPONENT,
  PANEL_FIELD,
  TICK_TASK,
  VIEW_COMPONENT,
  VIEW_PATH,
} from "./lib/constants.js";
import type { ResolvedWorkflows, WorkflowsPluginOptions } from "./options.js";
import { defaultRoles } from "./server/config.js";
import { effectTask, tickTask } from "./server/effects.js";
import { mergeTranslations } from "./translations/merge.js";
import { definitionIssues, formatIssues } from "./validate.js";

const hasDrafts = (collection: CollectionConfig): boolean =>
  Boolean(
    collection.versions && typeof collection.versions === "object" && collection.versions.drafts
  );

/** Every problem with the options against the config, in one error. */
const optionIssues = (options: WorkflowsPluginOptions, config: Config): string[] => {
  const issues: string[] = [];
  const slugs = new Set((config.collections ?? []).map((collection) => collection.slug));
  const effects = options.effects ?? {};
  const seen = new Set<string>();
  options.workflows.forEach((def, i) => {
    const path = `workflows[${i}]`;
    issues.push(...definitionIssues(def).map((issue) => `${path}.${issue}`));
    if (seen.has(def.name)) {
      issues.push(`${path}.name: duplicate workflow name "${def.name}"`);
    }
    seen.add(def.name);
    (def.collections ?? []).forEach((slug, c) => {
      if (!slugs.has(slug)) {
        issues.push(`${path}.collections[${c}]: collection "${slug}" is not in the config`);
      }
    });
    // A `publish` guard needs drafts: without them every save writes the live document.
    const draftless = (def.collections ?? []).filter((slug) => {
      const collection = (config.collections ?? []).find((entry) => entry.slug === slug);
      return collection && !hasDrafts(collection);
    });
    (def.stages ?? []).forEach((stage, s) =>
      (stage.guards ?? []).forEach((guard, g) => {
        if (!(guard.operations ?? []).includes("publish")) {
          return;
        }
        for (const slug of draftless) {
          issues.push(
            `${path}.stages[${s}].guards[${g}]: workflow "${def.name}" stage "${stage.name}" guard "${guard.name}" holds "publish", but collection "${slug}" has no drafts (versions.drafts), so it has no publish to hold. Enable drafts on "${slug}" or guard "update" instead`
          );
        }
      })
    );
    def.stages.forEach((stage, s) =>
      (stage.activities ?? []).forEach((activity, a) =>
        activity.actions.forEach((action, k) =>
          (action.effects ?? []).forEach((name, e) => {
            if (!effects[name]) {
              issues.push(
                `${path}.stages[${s}].activities[${a}].actions[${k}].effects[${e}]: no handler is registered for effect "${name}"`
              );
            }
          })
        )
      )
    );
  });
  return issues;
};

/** Whether `jobs.autoRun` runs the `workflows` queue (an entry for it, or one for all queues). */
const autoRunCovers = async (payload: Payload): Promise<boolean> => {
  const autoRun = payload.config.jobs?.autoRun;
  const entries = typeof autoRun === "function" ? await autoRun(payload) : (autoRun ?? []);
  return entries.some((entry) => entry.allQueues === true || entry.queue === JOBS_QUEUE);
};

/**
 * Logs once at init when work would wait for a jobs runner that is not configured: effects run
 * inline only when the change that queued them owns its commit, and the tick only on a schedule.
 */
export const warnWithoutRunner = async (
  payload: Payload,
  options: WorkflowsPluginOptions
): Promise<void> => {
  const effects = new Set<string>();
  for (const def of options.workflows) {
    for (const stage of def.stages) {
      for (const activity of stage.activities ?? []) {
        for (const action of activity.actions) {
          for (const name of action.effects ?? []) {
            effects.add(name);
          }
        }
      }
    }
  }
  if ((effects.size === 0 && !options.tick) || (await autoRunCovers(payload))) {
    return;
  }
  const waiting: string[] = [];
  if (effects.size > 0) {
    waiting.push(
      `effects (${[...effects].map((name) => `"${name}"`).join(", ")}) queued while a transaction is open — by a document save that settles a run or auto-starts one (with database transactions on), or by a Local API call given a \`req\` that carries a transaction — and effects that failed inline and wait for a retry`
    );
  }
  if (options.tick) {
    waiting.push(`the scheduled "${TICK_TASK}" task (tick: { cron: "${options.tick.cron}" })`);
  }
  payload.logger.warn(
    `workflows: no jobs runner covers the "${JOBS_QUEUE}" queue, so ${waiting.join("; and ")} will wait until something runs it. Add \`jobs: { autoRun: [{ queue: "${JOBS_QUEUE}", cron: "* * * * *" }] }\` to your Payload config, or run that queue another way (e.g. the jobs run endpoint from a cron).`
  );
};

/** Sidebar panel on every subject collection; hidden by the component until the doc has an id. */
const withPanel = (collection: CollectionConfig, clientProps: object): CollectionConfig => {
  const panel: Field = {
    name: PANEL_FIELD,
    type: "ui",
    admin: {
      position: "sidebar",
      disableListColumn: true,
      components: { Field: { path: PANEL_COMPONENT, clientProps } },
    },
  };
  return { ...collection, fields: [...collection.fields, panel] };
};

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
    const instancesSlug = options.instancesSlug ?? DEFAULT_INSTANCES_SLUG;
    const resolved: ResolvedWorkflows = {
      definitions: options.workflows,
      effects: options.effects ?? {},
      roles: options.roles ?? defaultRoles,
      access: options.access ?? {},
      instancesSlug,
    };
    const subjects = new Set(options.workflows.flatMap((def) => def.collections));
    // What the admin components need; endpoint paths are relative to the API route.
    const client = {
      instancesSlug,
      endpoints: {
        state: `${ENDPOINT_PREFIX}/state`,
        start: `${ENDPOINT_PREFIX}/start`,
        fire: `${ENDPOINT_PREFIX}/fire`,
        abort: `${ENDPOINT_PREFIX}/abort`,
        instances: `${ENDPOINT_PREFIX}/instances`,
        definitions: `${ENDPOINT_PREFIX}/definitions`,
      },
      viewPath: VIEW_PATH,
    };
    return {
      ...config,
      collections: [
        ...(config.collections ?? []).map((collection) =>
          subjects.has(collection.slug)
            ? withPanel(withWorkflowHooks(collection), client)
            : collection
        ),
        instancesCollection(instancesSlug, options.overrides),
      ],
      endpoints: [...(config.endpoints ?? []), ...workflowEndpoints()],
      i18n: {
        ...config.i18n,
        translations: mergeTranslations(config.i18n, options.translations),
      },
      jobs: {
        ...config.jobs,
        tasks: [...(config.jobs?.tasks ?? []), effectTask, tickTask(options.tick?.cron)],
      },
      admin: {
        ...config.admin,
        components: {
          ...config.admin?.components,
          afterNavLinks: [
            ...(config.admin?.components?.afterNavLinks ?? []),
            { path: NAV_LINK_COMPONENT, clientProps: client },
          ],
          views: {
            ...config.admin?.components?.views,
            workflows: {
              Component: { path: VIEW_COMPONENT, clientProps: client },
              path: VIEW_PATH,
              exact: true,
            },
          },
        },
        custom: { ...config.admin?.custom, workflows: client },
      },
      custom: { ...config.custom, workflows: resolved },
      onInit: async (payload) => {
        await config.onInit?.(payload);
        await warnWithoutRunner(payload, options);
      },
    };
  };
