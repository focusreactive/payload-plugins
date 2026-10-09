import { describe, it, expect, vi } from "vitest";
import type { Config, Payload, CollectionSlug } from "payload";
import type { TaskRunnerContext } from "../server/modules/task-runner/index.js";
import type { TaskEvent } from "../server/modules/task-runner/types.js";
import type { TranslationLifecycleCallbacks } from "../server/modules/lifecycle/types.js";

import { translatorPlugin } from "../plugin.js";
import { AnyAccessGuard } from "../server/shared/access/AnyAccessGuard.js";
import type { TranslatorPluginConfig } from "../plugin.js";
import { withAutoTranslate } from "../auto-translate-config.js";
import { documentLevel, fieldLevel } from "../composition/levels/index.js";
import { TranslateDocumentExport } from "../client/widgets/translate-document/index.js";
import { BulkDocumentTranslationDashboard } from "../client/widgets/bulk-translation-dashboard/ui/BulkTranslationDashboard.export.js";

// Isolate the lifecycle-wiring tests from the real pipeline: a mocked translateContent that returns
// null makes the handler finish cleanly (nothing to translate) so we can assert `completed` fires
// without standing up a provider. `vi.mock` is hoisted, so it applies regardless of position; kept
// below the imports to satisfy the import/first lint rule. Other tests never execute the handler.
vi.mock("../core/translation-pipeline/index.js", () => ({
  translateContent: vi.fn().mockResolvedValue(null),
}));

// End-to-end behaviour guard for the levels refactor: the default levels must
// reproduce today's wiring (6-route bundle, cache provider, doc popup + bulk
// dashboard on managed collections, runner configured once), and an explicit
// `levels` list must scope the surfaces accordingly.

const makeCollection = () => ({
  slug: "posts",
  fields: [{ name: "title", type: "text", localized: true }],
});
const makeRunner = () => ({
  create: vi.fn(),
  configure: vi.fn().mockReturnValue((c: Config) => c),
});

async function build(overrides: Partial<TranslatorPluginConfig> = {}) {
  const runner = overrides.runner ?? makeRunner();
  const collection = makeCollection();
  const incoming = { collections: [collection] } as unknown as Config;
  const pluginConfig = {
    collections: [collection],
    translationProvider: { translate: vi.fn() },
    // The plugin refuses to start without an access decision; these fixtures make the open one.
    access: new AnyAccessGuard(),
    runner,
    ...overrides,
  } as unknown as TranslatorPluginConfig;

  const result = await translatorPlugin(pluginConfig)(incoming);
  return {
    result,
    runner: runner as ReturnType<typeof makeRunner>,
    posts: result.collections?.[0] as Record<string, any>,
  };
}

describe("translatorPlugin — default levels (behaviour-preserving)", () => {
  it("registers the shared route bundle once (document + collection share it)", async () => {
    const { result } = await build();
    expect(result.endpoints).toHaveLength(8); // not 16 — deduped across the two doc levels
    expect(result.endpoints?.map((e) => e.path)).toContain("/translate/enqueue");
  });

  it("does not duplicate endpoints when the same config is run through the plugin twice", async () => {
    const collection = makeCollection();
    const pluginConfig = {
      collections: [collection],
      translationProvider: { translate: vi.fn() },
      // The plugin refuses to start without an access decision; these fixtures make the open one.
      access: new AnyAccessGuard(),
      runner: makeRunner(),
    } as unknown as TranslatorPluginConfig;

    const once = await translatorPlugin(pluginConfig)({
      collections: [collection],
    } as unknown as Config);
    const twice = await translatorPlugin(pluginConfig)(once);

    // Endpoint seeding dedups against routes already on the config, so a second
    // registration on the same config doesn't double the 6-route bundle.
    expect(twice.endpoints).toHaveLength(8);
  });

  it("adds the cache provider and configures the runner once", async () => {
    const { result, runner } = await build();
    expect(result.admin?.components?.providers).toHaveLength(1);
    expect(runner.configure).toHaveBeenCalledTimes(1);
  });

  it("attaches the doc popup and bulk dashboard to the managed collection (right component on right slot)", async () => {
    const { posts } = await build();
    expect(posts.admin.components.edit.beforeDocumentControls).toHaveLength(1);
    expect(posts.admin.components.edit.beforeDocumentControls[0]).toBeInstanceOf(
      TranslateDocumentExport
    );
    expect(posts.admin.components.beforeListTable).toHaveLength(1);
    expect(posts.admin.components.beforeListTable[0]).toBeInstanceOf(
      BulkDocumentTranslationDashboard
    );
  });

  it("threads a custom basePath into every endpoint", async () => {
    const { result } = await build({ basePath: "/i18n" });
    expect(result.endpoints?.every((e) => e.path.startsWith("/i18n/"))).toBe(true);
  });
});

describe("translatorPlugin — explicit levels", () => {
  it("documentLevel only → bundle present, doc popup yes, bulk dashboard no", async () => {
    const { result, posts } = await build({ levels: [documentLevel()] });
    expect(result.endpoints).toHaveLength(8);
    expect(posts.admin.components.edit.beforeDocumentControls).toHaveLength(1);
    expect(posts.admin.components.beforeListTable).toBeUndefined();
  });

  it("fieldLevel only → one /field endpoint, no doc routes, no collection components", async () => {
    const { result, posts } = await build({ levels: [fieldLevel()] });
    expect(result.endpoints).toHaveLength(1);
    expect(result.endpoints?.[0].path).toBe("/translate/field");
    expect(result.endpoints?.[0].method).toBe("post");
    expect(posts.admin).toBeUndefined();
  });

  it("empty levels → no endpoints/components, but cache provider + runner config still happen", async () => {
    const { result, runner } = await build({ levels: [] });
    expect(result.endpoints ?? []).toHaveLength(0);
    expect(result.collections?.[0] as Record<string, any>).not.toHaveProperty("admin");
    expect(result.admin?.components?.providers).toHaveLength(1);
    expect(runner.configure).toHaveBeenCalledTimes(1);
  });
});

const provenanceOf = (result: Config, slug = "translator-provenance") =>
  result.collections?.find((c) => c.slug === slug) as Record<string, any> | undefined;

describe("translatorPlugin — provenance (opt-in)", () => {
  it("does not add the provenance collection by default", async () => {
    const { result } = await build();
    expect(provenanceOf(result)).toBeUndefined();
  });

  it("adds the hidden provenance sidecar when provenance is enabled with {}", async () => {
    const { result } = await build({ provenance: {} } as Partial<TranslatorPluginConfig>);
    const provenance = provenanceOf(result);
    expect(provenance).toBeDefined();
    expect(provenance?.admin?.hidden).toBe(true);
  });

  it("enables provenance with the default slug when set to true", async () => {
    const { result } = await build({ provenance: true } as Partial<TranslatorPluginConfig>);
    expect(provenanceOf(result)).toBeDefined();
  });

  it("does not add the provenance collection when set to false", async () => {
    const { result } = await build({ provenance: false } as Partial<TranslatorPluginConfig>);
    expect(provenanceOf(result)).toBeUndefined();
  });

  it("honours a custom provenance slug", async () => {
    const { result } = await build({
      provenance: { slug: "my-provenance" },
    } as Partial<TranslatorPluginConfig>);
    expect(provenanceOf(result, "my-provenance")).toBeDefined();
    expect(provenanceOf(result)).toBeUndefined();
  });

  it("falls back to the default slug when given a blank slug", async () => {
    // `||` (not `??`) in resolveProvenanceSlug: a blank slug must enable with the default, not disable.
    const { result } = await build({
      provenance: { slug: "" },
    } as Partial<TranslatorPluginConfig>);
    expect(provenanceOf(result)).toBeDefined();
  });

  it("throws when the provenance slug collides with an existing collection", async () => {
    await expect(
      build({ provenance: { slug: "posts" } } as Partial<TranslatorPluginConfig>)
    ).rejects.toThrow(/posts/u);
  });

  it("does not duplicate the provenance collection when run twice", async () => {
    const collection = {
      slug: "posts",
      fields: [{ name: "title", type: "text", localized: true }],
    };
    const pluginConfig = {
      collections: [collection],
      translationProvider: { translate: vi.fn() },
      // The plugin refuses to start without an access decision; these fixtures make the open one.
      access: new AnyAccessGuard(),
      runner: { create: vi.fn(), configure: vi.fn().mockReturnValue((c: Config) => c) },
      provenance: {},
    } as unknown as TranslatorPluginConfig;

    const once = await translatorPlugin(pluginConfig)({
      collections: [collection],
    } as unknown as Config);
    const twice = await translatorPlugin(pluginConfig)(once);

    expect(twice.collections?.filter((c) => c.slug === "translator-provenance")).toHaveLength(1);
  });

  it("adds both sidecars when run twice with two different provenance slugs", async () => {
    const collection = {
      slug: "posts",
      fields: [{ name: "title", type: "text", localized: true }],
    };
    const makePluginConfig = (slug: string) =>
      ({
        collections: [collection],
        translationProvider: { translate: vi.fn() },
        // The plugin refuses to start without an access decision; these fixtures make the open one.
        access: new AnyAccessGuard(),
        runner: { create: vi.fn(), configure: vi.fn().mockReturnValue((c: Config) => c) },
        provenance: { slug },
      }) as unknown as TranslatorPluginConfig;

    const once = await translatorPlugin(makePluginConfig("provenance-a"))({
      collections: [collection],
    } as unknown as Config);
    const twice = await translatorPlugin(makePluginConfig("provenance-b"))(once);

    expect(provenanceOf(twice, "provenance-a")).toBeDefined();
    expect(provenanceOf(twice, "provenance-b")).toBeDefined();
  });

  it("attaches a delete-cleanup afterDelete hook to translatable collections when enabled", async () => {
    const { posts } = await build({ provenance: {} } as Partial<TranslatorPluginConfig>);
    expect(posts.hooks?.afterDelete).toHaveLength(1);
  });

  it("does not attach a cleanup hook when provenance is disabled", async () => {
    const { posts } = await build();
    expect(posts.hooks?.afterDelete ?? []).toHaveLength(0);
  });

  it("does not attach the cleanup hook to the sidecar collection itself", async () => {
    const { result } = await build({ provenance: {} } as Partial<TranslatorPluginConfig>);
    expect(provenanceOf(result)?.hooks?.afterDelete ?? []).toHaveLength(0);
  });

  it("does not stack duplicate cleanup hooks when run twice", async () => {
    const collection = {
      slug: "posts",
      fields: [{ name: "title", type: "text", localized: true }],
    };
    const pluginConfig = {
      collections: [collection],
      translationProvider: { translate: vi.fn() },
      // The plugin refuses to start without an access decision; these fixtures make the open one.
      access: new AnyAccessGuard(),
      runner: { create: vi.fn(), configure: vi.fn().mockReturnValue((c: Config) => c) },
      provenance: {},
    } as unknown as TranslatorPluginConfig;

    const once = await translatorPlugin(pluginConfig)({
      collections: [collection],
    } as unknown as Config);
    const twice = await translatorPlugin(pluginConfig)(once);

    const posts = twice.collections?.find((c) => c.slug === "posts") as Record<string, any>;
    expect(posts.hooks?.afterDelete).toHaveLength(1);
  });
});

const markedAfterChange = (col: Record<string, any> | undefined) =>
  (col?.hooks?.afterChange ?? []).filter(
    (h: { __translatorAutoTranslate?: boolean }) => h.__translatorAutoTranslate === true
  );

describe("translatorPlugin — auto-translate (opt-in wiring)", () => {
  // Run the plugin end-to-end with a caller-supplied collection set (same object used for the
  // incoming config, mirroring how buildConfig passes collections), returning the built result.
  const runWith = async (collections: unknown[]) => {
    const pluginConfig = {
      collections,
      translationProvider: { translate: vi.fn() },
      // The plugin refuses to start without an access decision; these fixtures make the open one.
      access: new AnyAccessGuard(),
      runner: makeRunner(),
    } as unknown as TranslatorPluginConfig;
    return translatorPlugin(pluginConfig)({ collections } as unknown as Config);
  };

  it("attaches exactly one marked afterChange hook to a collection wrapped with withAutoTranslate", async () => {
    const posts = withAutoTranslate(makeCollection() as never, { targets: ["de", "fr"] });
    const result = await runWith([posts]);
    const built = result.collections?.find((c) => c.slug === "posts") as Record<string, any>;
    expect(markedAfterChange(built)).toHaveLength(1);
  });

  it("does not attach the hook to a collection that was not wrapped", async () => {
    const result = await runWith([makeCollection()]);
    const built = result.collections?.find((c) => c.slug === "posts") as Record<string, any>;
    expect(markedAfterChange(built)).toHaveLength(0);
  });

  it("does not attach the hook to any collection when none opted in", async () => {
    const result = await runWith([makeCollection()]);
    for (const c of result.collections ?? []) {
      expect(markedAfterChange(c as Record<string, any>)).toHaveLength(0);
    }
  });

  it("does not stack duplicate hooks when the same config is run through the plugin twice", async () => {
    const posts = withAutoTranslate(makeCollection() as never, { targets: ["de"] });
    const pluginConfig = {
      collections: [posts],
      translationProvider: { translate: vi.fn() },
      // The plugin refuses to start without an access decision; these fixtures make the open one.
      access: new AnyAccessGuard(),
      runner: makeRunner(),
    } as unknown as TranslatorPluginConfig;
    const once = await translatorPlugin(pluginConfig)({
      collections: [posts],
    } as unknown as Config);
    const twice = await translatorPlugin(pluginConfig)(once);
    const built = twice.collections?.find((c) => c.slug === "posts") as Record<string, any>;
    expect(markedAfterChange(built)).toHaveLength(1);
  });
});

describe("translatorPlugin — lifecycle callbacks", () => {
  // The runner's execution handler is what the plugin wraps for completed/failed. It is handed to
  // `runner.configure(context)` at init, so we capture it from the configure mock and invoke it.
  const capturedHandler = (runner: ReturnType<typeof makeRunner>) =>
    runner.configure.mock.calls[0][0].handler as (
      payload: Payload,
      input: Record<string, unknown>
    ) => Promise<void>;

  const handlerInput = (overrides: Record<string, unknown> = {}) => ({
    collection: "posts",
    collectionId: "doc-1",
    sourceLng: "en",
    targetLng: "de",
    strategy: "overwrite",
    publishOnTranslation: false,
    ...overrides,
  });

  const mockPayload = () =>
    ({
      findByID: vi.fn().mockResolvedValue({ id: "doc-1" }),
      logger: { error: vi.fn() },
      collections: { posts: { config: { versions: undefined } } },
    }) as unknown as Payload;

  it("does not fail the task when a lifecycle callback throws (swallow + log)", async () => {
    const onCompleted = vi.fn(() => {
      throw new Error("callback boom");
    });
    const { runner } = await build({
      lifecycle: { onCompleted },
    } as Partial<TranslatorPluginConfig>);

    await expect(capturedHandler(runner)(mockPayload(), handlerInput())).resolves.toBeUndefined();
  });

  describe("the handler translates and reports nothing", () => {
    it("lets a translation failure out, so the runner can see it", async () => {
      const { runner } = await build({ lifecycle: {} } as Partial<TranslatorPluginConfig>);

      await expect(
        capturedHandler(runner)(mockPayload(), handlerInput({ collection: "unknown" })),
        "the runner decides what a throw means — it cannot if the handler swallows it"
      ).rejects.toBeDefined();
    });

    it.each([
      ["onCompleted", "posts"],
      ["onFailed", "unknown"],
    ])("does not call %s itself", async (callbackName, collection) => {
      const callback = vi.fn();
      const { runner } = await build({
        lifecycle: { [callbackName]: callback },
      } as Partial<TranslatorPluginConfig>);

      await capturedHandler(runner)(mockPayload(), handlerInput({ collection })).catch(
        () => undefined
      );

      expect(
        callback,
        "reporting is the runner's through `report`; a second road would double every event"
      ).not.toHaveBeenCalled();
    });
  });

  describe("the report channel is the only road to the host", () => {
    const assignment = {
      collectionSlug: "posts" as CollectionSlug,
      collectionId: "doc-1",
      sourceLng: "en",
      targetLng: "de",
      strategy: "overwrite",
      handle: "run-1",
    };

    const contextHandedToTheRunner = async (lifecycle: Record<string, unknown>) => {
      let captured: TaskRunnerContext | undefined;
      const runner = {
        create: vi.fn().mockReturnValue({
          enqueue: vi.fn().mockResolvedValue(undefined),
          cancel: vi.fn(),
          run: vi.fn(),
          findByCollection: vi.fn(),
        }),
        configure: vi.fn((context: TaskRunnerContext) => {
          captured = context;
          return (c: Config) => c;
        }),
      };
      await build({ runner, lifecycle } as unknown as Partial<TranslatorPluginConfig>);
      return captured as TaskRunnerContext;
    };

    const payload = { logger: { error: vi.fn() } } as unknown as Payload;

    const mappings: Array<[string, keyof TranslationLifecycleCallbacks, TaskEvent]> = [
      ["queued", "onQueued", { state: "queued" }],
      ["delivered", "onCompleted", { state: "delivered" }],
      ["failed", "onFailed", { state: "failed", error: new Error("provider down") }],
      ["cancelled", "onCancelled", { state: "cancelled" }],
    ];

    it.each(mappings)("turns %s into %s", async (_label, callbackName, event) => {
      const callback = vi.fn();
      const context = await contextHandedToTheRunner({ [callbackName]: callback });

      await context.report(payload, assignment, event);

      expect(callback, `${String(event)} must reach ${callbackName}`).toHaveBeenCalledWith(
        expect.objectContaining({ collection: "posts", id: "doc-1", targetLng: "de" }),
        ...(callbackName === "onFailed" ? [expect.any(Error)] : [])
      );
    });

    it("tells a host nothing it did not register for", async () => {
      const onCompleted = vi.fn();
      const context = await contextHandedToTheRunner({ onCompleted });

      await context.report(payload, assignment, { state: "cancelled" });

      expect(onCompleted, "a cancellation is not a completion").not.toHaveBeenCalled();
    });
  });
});
