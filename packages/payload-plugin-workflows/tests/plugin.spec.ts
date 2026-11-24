import type { CollectionConfig, Config, Payload } from "payload";
import { describe, expect, it, vi } from "vitest";

import { warnWithoutRunner, workflowsPlugin } from "../src/plugin.js";
import { listWorkflowDefinitions } from "../src/server/queries.js";
import type { WorkflowsSettings } from "../src/plugin.js";
import { editorialReview, minimal } from "./fixtures.js";

const config = (): Config =>
  ({
    collections: [
      {
        slug: "pages",
        fields: [{ name: "title", type: "text" }],
        versions: { drafts: true },
        hooks: { afterChange: [() => null] },
      },
      { slug: "posts", fields: [] },
    ],
    admin: { components: { afterNavLinks: ["x"] } },
    jobs: { tasks: [{ slug: "mine", handler: () => ({ output: {} }) }] },
    custom: { keep: 1 },
  }) as unknown as Config;

const notify = async () => undefined;

const run = (options: Partial<Parameters<typeof workflowsPlugin>[0]> = {}) =>
  workflowsPlugin({
    workflows: [editorialReview],
    effects: { "notify-author": notify },
    ...options,
  })(config()) as Config;

const bySlug = (result: Config, slug: string) =>
  result.collections?.find((collection) => collection.slug === slug) as CollectionConfig;

describe("workflowsPlugin", () => {
  it("adds the instances collection, locked against API writes", () => {
    const instances = bySlug(run(), "workflow-instances");
    const access = instances.access!;
    expect((access.create as () => boolean)()).toBe(false);
    expect((access.update as () => boolean)()).toBe(false);
    expect((access.delete as () => boolean)()).toBe(false);
    const read = access.read as (a: unknown) => boolean;
    const payload = { config: { admin: { user: "users" } } };
    expect(read({ req: { payload, user: { id: 1, collection: "users" } } })).toBe(true);
    // A user of another auth collection (e.g. API clients) is not an admin user.
    expect(read({ req: { payload, user: { id: 1, collection: "clients" } } })).toBe(false);
    expect(read({ req: { payload, user: null } })).toBe(false);
    const names = instances.fields.map((field) => ("name" in field ? field.name : null));
    expect(names).toEqual([
      "workflow",
      "subjectCollection",
      "subjectId",
      "stage",
      "status",
      "fields",
      "activities",
      "fired",
      "history",
      "assignedUsers",
      "assignedRoles",
      "revision",
      "activeKey",
      "completedAt",
    ]);
    expect(instances.fields.find((f) => "name" in f && f.name === "activeKey")).toMatchObject({
      unique: true,
    });
  });

  it("injects the indicator and the hooks into subject collections only, with no sidebar field", () => {
    const result = workflowsPlugin({
      workflows: [editorialReview],
      effects: { "notify-author": notify },
    })({
      ...config(),
      collections: [
        {
          ...config().collections![0]!,
          admin: { components: { edit: { beforeDocumentControls: ["x"] } } },
        },
        { slug: "posts", fields: [] },
      ],
    } as Config) as Config;
    const pages = bySlug(result, "pages");
    expect(pages.fields).toEqual([{ name: "title", type: "text" }]);
    expect(pages.admin?.components?.edit?.beforeDocumentControls).toEqual([
      "x",
      "@focus-reactive/payload-plugin-workflows/client#WorkflowIndicator",
    ]);
    expect(bySlug(run(), "pages").admin?.components?.edit?.beforeDocumentControls).toHaveLength(1);
    expect(pages.hooks?.afterChange).toHaveLength(2);
    expect(pages.hooks?.beforeChange).toHaveLength(1);
    expect(pages.hooks?.beforeDelete).toHaveLength(1);
    expect(pages.hooks?.afterDelete).toHaveLength(1);
    expect(bySlug(result, "posts")).toEqual({ slug: "posts", fields: [] });
  });

  it("registers endpoints, jobs and its config, and leaves the nav alone", () => {
    const result = run();
    expect(result.admin?.components).toEqual({ afterNavLinks: ["x"] });
    expect(result.endpoints?.map((e) => `${e.method} ${e.path}`)).toEqual([
      "get /workflows/state",
      "post /workflows/start",
      "post /workflows/fire",
      "post /workflows/abort",
    ]);
    const tasks = result.jobs?.tasks ?? [];
    expect(tasks.map((t) => t.slug)).toEqual(["mine", "workflowEffect", "workflowTick"]);
    expect(tasks[1]?.retries).toBe(2);
    // The tick is not scheduled: a host that needs it queues it itself.
    expect(tasks[2]?.schedule).toBeUndefined();
    const settings = result.custom?.workflows as WorkflowsSettings;
    expect(result.custom?.keep).toBe(1);
    expect(settings.workflows).toEqual([editorialReview]);
    expect(settings.roles({ roles: ["a", 1], collection: "users" } as never)).toEqual(["a"]);
    expect(settings.roles({ role: "b" } as never)).toEqual(["b"]);
    expect(settings.roles({} as never)).toEqual([]);
  });

  it("adds its English strings under `workflows` for every locale, under the host's own", () => {
    const result = workflowsPlugin({
      workflows: [editorialReview],
      effects: { "notify-author": notify },
    })({
      ...config(),
      i18n: {
        translations: {
          en: { custom: { hello: "Hi" }, workflows: { widgetViewAll: "All" } },
          de: { workflows: { widgetTitle: "Arbeitsabläufe" } },
        },
      },
    } as unknown as Config) as Config;
    const translations = result.i18n?.translations as Record<
      string,
      Record<string, Record<string, string>>
    >;
    expect(translations.en?.custom).toEqual({ hello: "Hi" });
    expect(translations.en?.workflows?.widgetTitle).toBe("Workflows");
    expect(translations.en?.workflows?.widgetViewAll).toBe("All");
    expect(translations.de?.workflows?.widgetTitle).toBe("Arbeitsabläufe");
    expect(translations.de?.workflows?.widgetWaiting).toBe("Waiting on you");
  });

  it("does nothing when disabled", () => {
    const original = config();
    expect(workflowsPlugin({ enabled: false, workflows: [editorialReview] })(original)).toBe(
      original
    );
  });

  it("validates everything at once: definitions, unique names, collections, effect handlers", () => {
    const broken = { ...minimal(), collections: ["nope"], initialStage: "zzz" };
    expect(() =>
      workflowsPlugin({ workflows: [editorialReview, editorialReview, broken] })(config())
    ).toThrowError(
      [
        "workflowsPlugin() failed validation (5 issues):",
        '  - workflows[0].stages[1].activities[0].actions[2].effects[0]: no handler is registered for effect "notify-author"',
        '  - workflows[1].name: duplicate workflow name "editorial-review"',
        '  - workflows[1].stages[1].activities[0].actions[2].effects[0]: no handler is registered for effect "notify-author"',
        '  - workflows[2].initialStage: initial stage "zzz" is not a declared stage. Known stages: "a", "b"',
        '  - workflows[2].collections[0]: collection "nope" is not in the config',
      ].join("\n")
    );
  });
});

describe("the workflows list (runs collection in the admin)", () => {
  const instances = () => bySlug(run(), "workflow-instances");
  const field = (name: string) =>
    instances().fields.find((entry) => "name" in entry && entry.name === name) as {
      admin?: { hidden?: boolean; components?: { Cell?: unknown } };
    };

  it("is a visible list, read-only, whose rows open their document", () => {
    const { admin, defaultSort } = instances();
    expect(admin?.hidden).toBeUndefined();
    expect(defaultSort).toBe("-updatedAt");
    expect(admin?.defaultColumns).toEqual([
      "subjectId",
      "workflow",
      "stage",
      "status",
      "assignedUsers",
      "updatedAt",
    ]);
    const url = admin?.formatDocURL?.({
      collectionSlug: "workflow-instances",
      defaultURL: "/admin/collections/workflow-instances/1",
      doc: { subjectCollection: "pages", subjectId: "12" },
      req: { payload: { config: { routes: { admin: "/admin" } } } } as never,
    });
    expect(url).toBe("/admin/collections/pages/12");
  });

  it("hides the run's internals and renders names through the plugin's cells", () => {
    for (const name of ["fields", "activities", "fired", "history", "revision", "activeKey"]) {
      expect(field(name).admin?.hidden, name).toBe(true);
    }
    expect(field("subjectId").admin?.components?.Cell).toBe(
      "@focus-reactive/payload-plugin-workflows/client#SubjectCell"
    );
    expect(field("assignedUsers").admin?.components?.Cell).toBe(
      "@focus-reactive/payload-plugin-workflows/client#WaitingOnCell"
    );
    for (const name of ["workflow", "stage", "status"]) {
      expect(field(name).admin?.components?.Cell, name).toBe(
        "@focus-reactive/payload-plugin-workflows/rsc#RunCell"
      );
    }
  });
});

describe("dashboard widget", () => {
  it("knows each workflow's final stages, which its board leaves out", () => {
    const payload = { config: { custom: run().custom } } as unknown as Payload;
    const [def] = listWorkflowDefinitions(payload).definitions;
    expect(def?.stages.map((stage) => [stage.name, stage.final])).toEqual(
      editorialReview.stages.map((stage) => [stage.name, (stage.transitions ?? []).length === 0])
    );
    expect(def?.stages.at(-1)?.final).toBe(true);
    expect(def?.stages[0]?.final).toBe(false);
  });

  const ours = { widgetSlug: "workflows", width: "full" };
  const withAdmin = (admin: Record<string, unknown>) =>
    workflowsPlugin({ workflows: [editorialReview], effects: { "notify-author": notify } })({
      ...config(),
      admin: { ...config().admin, ...admin },
    } as Config) as Config;

  it("registers the widget after the host's widgets", () => {
    const dashboard = withAdmin({
      dashboard: { widgets: [{ slug: "mine", Component: "x" }] },
    }).admin?.dashboard;
    expect(dashboard?.widgets.map((widget) => widget.slug)).toEqual(["mine", "workflows"]);
    expect(dashboard?.widgets[1]).toMatchObject({
      Component: "@focus-reactive/payload-plugin-workflows/rsc#WorkflowsWidget",
      minWidth: "medium",
    });
  });

  it("without a host layout, puts it first and keeps Payload's default collections widget", () => {
    expect(run().admin?.dashboard?.defaultLayout).toEqual([
      ours,
      { widgetSlug: "collections", width: "full" },
    ]);
    // The rest of the host's admin config is untouched.
    expect(run().admin?.components).toEqual({ afterNavLinks: ["x"] });
  });

  it("appends it to a host's array layout, once", () => {
    const host = [{ widgetSlug: "mine", width: "medium" }];
    expect(
      withAdmin({ dashboard: { widgets: [], defaultLayout: host } }).admin?.dashboard
    ).toMatchObject({ defaultLayout: [...host, ours] });
    const placed = [ours, ...host];
    expect(
      withAdmin({ dashboard: { widgets: [], defaultLayout: placed } }).admin?.dashboard
        ?.defaultLayout
    ).toEqual(placed);
  });

  it("wraps a host's layout function", async () => {
    const host = vi.fn(async () => [{ widgetSlug: "mine", width: "small" as const }]);
    const layout = withAdmin({ dashboard: { widgets: [], defaultLayout: host } }).admin?.dashboard
      ?.defaultLayout;
    expect(typeof layout).toBe("function");
    const req = { user: { id: 1 } };
    const result = await (layout as (args: { req: unknown }) => Promise<unknown>)({ req });
    expect(host).toHaveBeenCalledWith({ req });
    expect(result).toEqual([{ widgetSlug: "mine", width: "small" }, ours]);
  });

  it("is left out with `dashboard: false`", () => {
    const result = workflowsPlugin({
      workflows: [editorialReview],
      effects: { "notify-author": notify },
      dashboard: false,
    })(config()) as Config;
    expect(result.admin).toEqual(config().admin);
  });
});

describe("publish guards need drafts", () => {
  it("rejects a publish guard on a workflow whose collections include one without drafts", () => {
    const def = { ...editorialReview, collections: ["pages", "posts"] };
    const withDrafts = () =>
      ({
        ...config(),
        collections: [
          { slug: "pages", fields: [], versions: { drafts: true } },
          { slug: "posts", fields: [] },
        ],
      }) as unknown as Config;
    expect(() =>
      workflowsPlugin({ workflows: [def], effects: { "notify-author": notify } })(withDrafts())
    ).toThrowError(
      [
        "workflowsPlugin() failed validation (1 issue):",
        '  - workflows[0].stages[1].guards[0]: workflow "editorial-review" stage "review" guard "hold-publish" holds "publish", but collection "posts" has no drafts (versions.drafts), so it has no publish to hold. Enable drafts on "posts" or guard "update" instead',
      ].join("\n")
    );
    expect(() =>
      workflowsPlugin({
        workflows: [{ ...editorialReview, collections: ["pages"] }],
        effects: { "notify-author": notify },
      })(withDrafts())
    ).not.toThrow();
  });
});

describe("jobs runner warning at init", () => {
  const payloadWith = (autoRun: unknown) => {
    const warn = vi.fn();
    return {
      warn,
      payload: { config: { jobs: { autoRun } }, logger: { warn } } as unknown as Payload,
    };
  };
  const options = { workflows: [editorialReview], effects: { "notify-author": notify } };

  it("warns once, naming the effects and how to configure the runner, when nothing runs the queue", async () => {
    for (const autoRun of [undefined, [{ queue: "default" }], () => [{ queue: "other" }]]) {
      const { payload, warn } = payloadWith(autoRun);
      await warnWithoutRunner(payload, options.workflows);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0]?.[0]).toContain('"notify-author"');
      expect(warn.mock.calls[0]?.[0]).toContain('autoRun: [{ queue: "workflows"');
    }
  });

  it("stays quiet when autoRun covers the queue, or there is nothing to run", async () => {
    for (const autoRun of [
      [{ queue: "workflows" }],
      [{ allQueues: true }],
      async () => [{ queue: "workflows" }],
    ]) {
      const { payload, warn } = payloadWith(autoRun);
      await warnWithoutRunner(payload, options.workflows);
      expect(warn).not.toHaveBeenCalled();
    }
    const { payload, warn } = payloadWith(undefined);
    await warnWithoutRunner(payload, [minimal()]);
    expect(warn).not.toHaveBeenCalled();
  });

  it("is wired into onInit after the host's own", async () => {
    const order: string[] = [];
    const host = { ...config(), onInit: async () => void order.push("host") } as Config;
    const result = workflowsPlugin(options)(host) as Config;
    const { payload, warn } = payloadWith(undefined);
    warn.mockImplementation(() => order.push("warn"));
    await result.onInit?.(payload);
    expect(order).toEqual(["host", "warn"]);
  });
});
