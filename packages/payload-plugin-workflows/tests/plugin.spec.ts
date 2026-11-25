import type { CollectionConfig, Config, Payload } from "payload";
import { describe, expect, it, vi } from "vitest";

import { warnWithoutRunner, workflowsPlugin } from "../src/plugin.js";
import { readWorkflowEvents, readWorkflows } from "../src/server/access.js";
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
  it("adds the instances collection, locked against API writes", async () => {
    const instances = bySlug(run(), "workflow-instances");
    const access = instances.access!;
    expect((access.create as () => boolean)()).toBe(false);
    expect((access.update as () => boolean)()).toBe(false);
    expect((access.delete as () => boolean)()).toBe(false);
    const read = access.read as (a: unknown) => Promise<unknown>;
    // No subject collection to narrow by here (the integration tests cover per-document rules).
    const payload = { config: { admin: { user: "users" } }, collections: {} };
    expect(await read({ req: { payload, user: { id: 1, collection: "users" } } })).toBe(true);
    // A user of another auth collection (e.g. API clients) is not an admin user.
    expect(await read({ req: { payload, user: { id: 1, collection: "clients" } } })).toBe(false);
    expect(await read({ req: { payload, user: null } })).toBe(false);
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
      "visit",
      "visited",
      "nextSeq",
      "startedBy",
      "schemaVersion",
      "definitionVersion",
      "assignees",
      "revision",
      "activeKey",
      "completedAt",
      "publishedAt",
    ]);
    expect(instances.fields.find((f) => "name" in f && f.name === "activeKey")).toMatchObject({
      unique: true,
    });
    // The hooks' per-save lookup has an index of its own.
    expect(instances.indexes).toEqual([{ fields: ["subjectCollection", "subjectId", "status"] }]);
    // Payload's list view reads only the shown columns, plus what the cells and links need.
    expect(instances.admin?.enableListViewSelectAPI).toBe(true);
    expect(instances.forceSelect).toEqual({
      workflow: true,
      subjectCollection: true,
      subjectId: true,
      stage: true,
      status: true,
    });
  });

  it("adds the events collection: append-only, read like runs, hidden from the nav", async () => {
    const events = bySlug(run(), "workflow-events");
    const access = events.access!;
    expect((access.create as () => boolean)()).toBe(false);
    expect((access.update as () => boolean)()).toBe(false);
    expect((access.delete as () => boolean)()).toBe(false);
    // Exactly who may read the run: the same rule, its visibility part read through `run`.
    expect(access.read).toBe(readWorkflowEvents);
    expect(bySlug(run(), "workflow-instances").access?.read).toBe(readWorkflows);
    expect(events.fields[0]).toMatchObject({
      name: "run",
      type: "relationship",
      relationTo: "workflow-instances",
      maxDepth: 0,
    });
    expect(events.admin?.hidden).toBe(true);
    expect(events.timestamps).toBe(false);
    const names = events.fields.map((field) => ("name" in field ? field.name : null));
    expect(names).toEqual([
      "run",
      "seq",
      "type",
      "at",
      "workflow",
      "subjectCollection",
      "subjectId",
      "stage",
      "actorId",
      "via",
      "cause",
      "activity",
      "action",
      "transition",
      "toStage",
      "effect",
      "status",
      "detail",
    ]);
    expect(events.indexes).toEqual([
      { fields: ["run", "seq"], unique: true },
      { fields: ["subjectCollection", "subjectId"] },
    ]);
    const indexed = events.fields.flatMap((field) =>
      "name" in field && "index" in field && field.index ? [field.name] : []
    );
    expect(indexed).toEqual(["type", "at", "actorId"]);
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

  it("registers endpoints on the runs collection, jobs and its config, and leaves the nav alone", () => {
    const result = run();
    expect(result.admin?.components).toEqual({ afterNavLinks: ["x"] });
    // No root endpoints: `/api/<first segment>` is a host collection's when a slug matches it.
    expect(result.endpoints).toBeUndefined();
    expect(
      (bySlug(result, "workflow-instances").endpoints || []).map((e) => `${e.method} ${e.path}`)
    ).toEqual(["get /state", "get /history", "post /start", "post /fire", "post /abort"]);
    const tasks = result.jobs?.tasks ?? [];
    expect(tasks.map((t) => t.slug)).toEqual([
      "mine",
      "workflowsPluginEffect",
      "workflowsPluginTick",
    ]);
    expect(tasks[1]?.retries).toBe(2);
    // Effects of one run are serialised only when the host turned Payload's concurrency on.
    expect(tasks[1]?.concurrency).toBeUndefined();
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

  it("serialises a run's effects with Payload's concurrency key when the host enables it", () => {
    const result = workflowsPlugin({
      workflows: [editorialReview],
      effects: { "notify-author": notify },
    })({
      ...config(),
      jobs: { ...config().jobs, enableConcurrencyControl: true },
    } as Config) as Config;
    const effect = result.jobs?.tasks?.find((task) => task.slug === "workflowsPluginEffect");
    const key = effect?.concurrency as (args: { input: object; queue: string }) => string;
    expect(key({ input: { instanceId: "42" }, queue: "workflows-plugin" })).toBe(
      "workflowsPluginEffect:42"
    );
  });

  it("disabled, keeps the runs collection (data and schema) and the jobs, and nothing else", () => {
    const original = config();
    const result = workflowsPlugin({ enabled: false, workflows: [editorialReview] })(
      original
    ) as Config;
    // The host's collections untouched: no hooks, no indicator.
    expect(bySlug(result, "pages")).toBe(original.collections?.[0]);
    const runs = bySlug(result, "workflow-instances");
    expect(runs.fields.map((field) => ("name" in field ? field.name : null))).toEqual(
      bySlug(run(), "workflow-instances").fields.map((field) =>
        "name" in field ? field.name : null
      )
    );
    expect(runs.endpoints).toBeUndefined();
    expect(runs.admin?.hidden).toBe(true);
    expect(JSON.stringify(runs.fields)).not.toContain("payload-plugin-workflows/");
    expect(result.jobs?.tasks?.map((task) => task.slug)).toEqual([
      "mine",
      "workflowsPluginEffect",
      "workflowsPluginTick",
    ]);
    expect(result.endpoints).toBeUndefined();
    expect(result.admin).toEqual(original.admin);
    expect(result.custom?.workflows).toBeDefined();
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
      "assignees",
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
    for (const name of [
      "fields",
      "activities",
      "fired",
      "visit",
      "visited",
      "nextSeq",
      "startedBy",
      "schemaVersion",
      "definitionVersion",
      "revision",
      "activeKey",
    ]) {
      expect(field(name).admin?.hidden, name).toBe(true);
    }
    expect(field("subjectId").admin?.components?.Cell).toBe(
      "@focus-reactive/payload-plugin-workflows/client#SubjectCell"
    );
    expect(field("assignees").admin?.components?.Cell).toBe(
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

  const ours = { widgetSlug: "workflows-plugin", width: "full" };
  const withAdmin = (admin: Record<string, unknown>) =>
    workflowsPlugin({ workflows: [editorialReview], effects: { "notify-author": notify } })({
      ...config(),
      admin: { ...config().admin, ...admin },
    } as Config) as Config;

  it("registers the widget after the host's widgets", () => {
    const dashboard = withAdmin({
      dashboard: { widgets: [{ slug: "mine", Component: "x" }] },
    }).admin?.dashboard;
    expect(dashboard?.widgets.map((widget) => widget.slug)).toEqual(["mine", "workflows-plugin"]);
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

/** A `visibility` option with these fields. */
const visibility = (fields: unknown[]) => ({
  fields: fields as never,
  fromDocument: () => ({}),
  read: () => true,
});

describe("requiredToPublish and visibility at config time", () => {
  const withDrafts = () =>
    ({
      ...config(),
      collections: [
        { slug: "pages", fields: [], versions: { drafts: true } },
        { slug: "posts", fields: [] },
      ],
    }) as unknown as Config;
  const minimalOn = (collections: string[], requiredToPublish?: string) => ({
    ...minimal(),
    collections,
    ...(requiredToPublish === undefined ? {} : { requiredToPublish }),
  });

  it("rejects requiredToPublish on a collection without drafts", () => {
    expect(() =>
      workflowsPlugin({ workflows: [minimalOn(["pages", "posts"], "b")] })(withDrafts())
    ).toThrowError(
      [
        "workflowsPlugin() failed validation (1 issue):",
        '  - workflows[0].requiredToPublish: workflow "minimal" is required to publish, but collection "posts" has no drafts (versions.drafts), so it has no publish to require it for. Enable drafts on "posts" or leave `requiredToPublish` out',
      ].join("\n")
    );
    expect(() =>
      workflowsPlugin({ workflows: [minimalOn(["pages"], "b")] })(withDrafts())
    ).not.toThrow();
  });

  it("rejects visibility fields without a name or named like the runs' own columns", () => {
    const issues = () =>
      workflowsPlugin({
        workflows: [minimalOn(["pages"])],
        visibility: visibility([
          { name: "tenant", type: "text" },
          { name: "status", type: "text" },
          { name: "createdAt", type: "date" },
          { type: "row", fields: [] },
          { name: "tenant", type: "text" },
        ]),
      })(withDrafts());
    expect(issues).toThrowError(
      [
        "workflowsPlugin() failed validation (4 issues):",
        '  - visibility.fields[1].name: "status" is a column of the plugin\'s runs collection; choose another name',
        '  - visibility.fields[2].name: "createdAt" is a column of the plugin\'s runs collection; choose another name',
        "  - visibility.fields[3]: needs a name (layout fields such as rows and tabs are not supported)",
        '  - visibility.fields[4].name: duplicate field name "tenant"',
      ].join("\n")
    );
  });

  it("adds the visibility fields to the runs collection, read-only, enabled or not", () => {
    for (const enabled of [true, false]) {
      const result = workflowsPlugin({
        enabled,
        workflows: [minimalOn(["pages"])],
        visibility: visibility([{ name: "tenant", type: "text", index: true }]),
      })(withDrafts()) as Config;
      expect(bySlug(result, "workflow-instances").fields.at(-1)).toEqual({
        name: "tenant",
        type: "text",
        index: true,
        admin: { readOnly: true },
      });
    }
    // Nothing is added to the events: they follow their run.
    const result = workflowsPlugin({
      workflows: [minimalOn(["pages"])],
      visibility: visibility([{ name: "tenant", type: "text" }]),
    })(withDrafts()) as Config;
    expect(
      bySlug(result, "workflow-events").fields.some(
        (field) => "name" in field && field.name === "tenant"
      )
    ).toBe(false);
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
      expect(warn.mock.calls[0]?.[0]).toContain('autoRun: [{ queue: "workflows-plugin"');
    }
  });

  it("stays quiet when autoRun covers the queue, or there is nothing to run", async () => {
    for (const autoRun of [
      [{ queue: "workflows-plugin" }],
      [{ allQueues: true }],
      async () => [{ queue: "workflows-plugin" }],
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
