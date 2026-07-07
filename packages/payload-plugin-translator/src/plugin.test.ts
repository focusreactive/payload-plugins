import { describe, it, expect, vi } from "vitest";
import type { Config, Payload } from "payload";

import { translatorPlugin } from "./plugin";
import type { TranslatorPluginConfig } from "./plugin";
import { documentLevel, fieldLevel } from "./composition/levels";
import { TranslateDocumentExport } from "./client/widgets/translate-document";
import { BulkDocumentTranslationDashboard } from "./client/widgets/bulk-translation-dashboard/ui/BulkTranslationDashboard.export";
import { withQueuedNotification } from "./server/modules/lifecycle";

// Isolate the lifecycle-wiring tests from the real pipeline: a mocked translateContent that returns
// null makes the handler finish cleanly (nothing to translate) so we can assert `completed` fires
// without standing up a provider. `vi.mock` is hoisted, so it applies regardless of position; kept
// below the imports to satisfy the import/first lint rule. Other tests never execute the handler.
vi.mock("./core/translation-pipeline", () => ({
  translateContent: vi.fn().mockResolvedValue(null),
}));

// Spy on withQueuedNotification while keeping its real behaviour, so a test can assert the runner
// was (or wasn't) wrapped for the `lifecycle.onQueued` absent/present branch in plugin.ts.
vi.mock("./server/modules/lifecycle", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./server/modules/lifecycle")>();
  return {
    ...actual,
    withQueuedNotification: vi.fn(actual.withQueuedNotification),
  };
});

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
  it("registers the 6-route bundle once (document + collection share it)", async () => {
    const { result } = await build();
    expect(result.endpoints).toHaveLength(6); // not 12 — deduped across the two doc levels
    expect(result.endpoints?.map((e) => e.path)).toContain("/translate/enqueue");
  });

  it("does not duplicate endpoints when the same config is run through the plugin twice", async () => {
    const collection = makeCollection();
    const pluginConfig = {
      collections: [collection],
      translationProvider: { translate: vi.fn() },
      runner: makeRunner(),
    } as unknown as TranslatorPluginConfig;

    const once = await translatorPlugin(pluginConfig)({
      collections: [collection],
    } as unknown as Config);
    const twice = await translatorPlugin(pluginConfig)(once);

    // Endpoint seeding dedups against routes already on the config, so a second
    // registration on the same config doesn't double the 6-route bundle.
    expect(twice.endpoints).toHaveLength(6);
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
    expect(result.endpoints).toHaveLength(6);
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
    }) as unknown as Payload;

  it("fires lifecycle.onCompleted after a successful task", async () => {
    const onCompleted = vi.fn();
    const { runner } = await build({
      lifecycle: { onCompleted },
    } as Partial<TranslatorPluginConfig>);

    await capturedHandler(runner)(mockPayload(), handlerInput());

    expect(onCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: "posts",
        id: "doc-1",
        sourceLng: "en",
        targetLng: "de",
      })
    );
  });

  it("fires lifecycle.onFailed with the error and rethrows so the runner marks it failed", async () => {
    const onFailed = vi.fn();
    const { runner } = await build({ lifecycle: { onFailed } } as Partial<TranslatorPluginConfig>);

    // an unknown collection makes the handler throw before translating
    let rejectedError: unknown;
    try {
      await capturedHandler(runner)(mockPayload(), handlerInput({ collection: "unknown" }));
    } catch (error) {
      rejectedError = error;
    }

    expect(rejectedError).toBeInstanceOf(Error);
    expect(onFailed).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "unknown" }),
      rejectedError
    );
    // the rejected error and the error handed to onFailed must be the identical object
    expect(onFailed.mock.calls[0][1]).toBe(rejectedError);
  });

  it("rethrows the original translation error even when onFailed itself throws", async () => {
    const onFailed = vi.fn(() => {
      throw new Error("callback boom");
    });
    const { runner } = await build({ lifecycle: { onFailed } } as Partial<TranslatorPluginConfig>);

    await expect(
      capturedHandler(runner)(mockPayload(), handlerInput({ collection: "unknown" }))
    ).rejects.toThrow(/not found in schemaMap/u);
  });

  it("does not fail the task when a lifecycle callback throws (swallow + log)", async () => {
    const onCompleted = vi.fn(() => {
      throw new Error("callback boom");
    });
    const { runner } = await build({
      lifecycle: { onCompleted },
    } as Partial<TranslatorPluginConfig>);

    await expect(capturedHandler(runner)(mockPayload(), handlerInput())).resolves.toBeUndefined();
  });

  it("fires lifecycle.onQueued for each task when enqueuing", async () => {
    const onQueued = vi.fn();
    const taskRunner = {
      enqueue: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn(),
      run: vi.fn(),
      findByCollection: vi.fn(),
    };
    const runner = {
      create: vi.fn().mockReturnValue(taskRunner),
      configure: vi.fn().mockReturnValue((c: Config) => c),
    };
    const { result } = await build({
      runner,
      lifecycle: { onQueued },
    } as unknown as Partial<TranslatorPluginConfig>);

    const enqueue = result.endpoints?.find((e) => e.path === "/translate/enqueue");
    const req = {
      json: async () => ({
        source_lng: "en",
        target_lng: "de",
        collection_slug: "posts",
        collection_id: ["1", "2"],
      }),
      payload: { logger: { error: vi.fn() } },
    };
    await enqueue?.handler?.(req as never);

    expect(onQueued).toHaveBeenCalledTimes(2);
    expect(onQueued).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }));
    expect(taskRunner.enqueue).toHaveBeenCalled();
  });

  it("does not wrap the runner in withQueuedNotification when lifecycle.onQueued is absent", async () => {
    vi.mocked(withQueuedNotification).mockClear();
    const taskRunner = {
      enqueue: vi.fn().mockResolvedValue(undefined),
      cancel: vi.fn(),
      run: vi.fn(),
      findByCollection: vi.fn(),
    };
    const runner = {
      create: vi.fn().mockReturnValue(taskRunner),
      configure: vi.fn().mockReturnValue((c: Config) => c),
    };
    const { result } = await build({
      runner,
      lifecycle: { onCompleted: vi.fn() },
    } as unknown as Partial<TranslatorPluginConfig>);

    const enqueue = result.endpoints?.find((e) => e.path === "/translate/enqueue");
    const req = {
      json: async () => ({
        source_lng: "en",
        target_lng: "de",
        collection_slug: "posts",
        collection_id: ["1", "2"],
      }),
      payload: { logger: { error: vi.fn() } },
    };
    await enqueue?.handler?.(req as never);

    expect(withQueuedNotification).not.toHaveBeenCalled();
    expect(taskRunner.enqueue).toHaveBeenCalled();
  });

  it("does not fire onFailed on the success path when both onCompleted and onFailed are registered", async () => {
    const onCompleted = vi.fn();
    const onFailed = vi.fn();
    const { runner } = await build({
      lifecycle: { onCompleted, onFailed },
    } as Partial<TranslatorPluginConfig>);

    await capturedHandler(runner)(mockPayload(), handlerInput());

    expect(onCompleted).toHaveBeenCalledTimes(1);
    expect(onFailed).not.toHaveBeenCalled();
  });

  it("does not fire onCompleted on the failure path when both onCompleted and onFailed are registered", async () => {
    const onCompleted = vi.fn();
    const onFailed = vi.fn();
    const { runner } = await build({
      lifecycle: { onCompleted, onFailed },
    } as Partial<TranslatorPluginConfig>);

    await expect(
      capturedHandler(runner)(mockPayload(), handlerInput({ collection: "unknown" }))
    ).rejects.toThrow();

    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onCompleted).not.toHaveBeenCalled();
  });
});
