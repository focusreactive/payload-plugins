import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { lexicalEditor } from "@payloadcms/richtext-lexical";
import {
  AnyAccessGuard,
  createTranslationProvider,
  createSyncRunner,
  documentTranslation,
  fieldTranslation,
  translateDocumentControl,
  translatorPlugin,
  withAutoTranslate,
} from "@focus-reactive/payload-plugin-translator";
import type {
  TaskRunnerProvider,
  TranslationLifecycleCallbacks,
  TranslationProvider,
  TranslationRequest,
} from "@focus-reactive/payload-plugin-translator";
import { buildConfig } from "payload";
import type { Block, CollectionConfig, Payload } from "payload";
import { getPayload } from "payload";

import { createTestDatabase } from "../../lib/database/resolveAdapter";
import { fakeAsk } from "../../lib/translator/fakeAsk";
import type { FakeTranslationOptions } from "../../lib/translator/fakeAsk";
import { buildTestCollections } from "./testCollections";

/** Payload's `autoRun.limit` default — these specs reproduce the cron's batching, not a run of one. */
export const CRON_BATCH_LIMIT = 50;

/**
 * A booted test Payload plus the throwaway resources to tear down after the suite.
 */
export type TestPayload = {
  payload: Payload;
  cleanup: () => Promise<void>;
  /**
   * Running count of translation-provider invocations since boot. Unlike provenance rows — which are
   * UPSERTed per (collection, doc, targetLocale) and so are pinned at "one row per configured target"
   * regardless of how many times translation actually runs — this counter increments on every real
   * `translate()` call. It moves when translation WORK happens, so a re-entry that spawns extra passes
   * is observable as a delta. Snapshot it before an action and diff after to attribute work to that
   * action (the loop-guard spec relies on this: one source publish must cause exactly one pass per
   * target, not more).
   */
  translateCount: () => number;
};

/** What a spec may vary about a boot. */
export type BootOptions = {
  /**
   * Stamped onto the `docs` collection. Omit it and nothing translates on publish; the enqueue route
   * still works.
   */
  autoTranslate?: { targets: string[] };
  /**
   * Replaces the shared fixture set entirely (not merged). The set must still contain a `docs`
   * collection when `autoTranslate` is passed.
   */
  collections?: CollectionConfig[];
  /** Registered with Payload, but not handed to the plugin. */
  unmanagedCollections?: CollectionConfig[];
  /** The config-level blocks a `blockReferences` slug points into. */
  blocks?: Block[];
  /**
   * Localization fallback, off by default: an unwritten locale reads as empty, not as the default
   * locale's text. Localization-level, so it applies to the whole boot.
   */
  fallback?: boolean;
  /**
   * Payload's own option; Payload defaults it to `true`, this boot to `false` so the status panels
   * have rows to read.
   */
  deleteJobOnComplete?: boolean;
  /** Payload's `enableConcurrencyControl` for this boot; defaults to `EXCLUSIVE_QUEUE=1`. */
  exclusiveQueue?: boolean;
  /**
   * Target locales the fake provider should throw for, so a spec can exercise a partial failure.
   * Every other locale translates normally.
   */
  failFor?: string[];
  /** Awaited before each provider call, so a spec can hold a locale mid-run. */
  onTranslate?: (targetLng: string) => Promise<void> | void;
  onRequest?: (request: TranslationRequest) => void;
  /**
   * Defaults to the sync runner. `createPayloadJobsRunner({ autoRun: false })` leaves queued jobs
   * unprocessed in `payload-jobs`, so a spec can read the rows.
   */
  runner?: TaskRunnerProvider;
  lifecycle?: TranslationLifecycleCallbacks;
  failedWindowMs?: number;
  fake?: FakeTranslationOptions;
  /** Also register the synchronous per-field surface, `POST {basePath}/field`. */
  fieldSurface?: boolean;
};

/** The options that steer the fake provider, rather than the Payload config. */
type ProviderProbe = Pick<BootOptions, "fake" | "failFor" | "onRequest" | "onTranslate">;

function countingProvider(probe: ProviderProbe): {
  provider: TranslationProvider;
  count: () => number;
} {
  const base = createTranslationProvider({ askModel: fakeAsk(probe.fake) });
  const failFor = new Set(probe.failFor);
  let calls = 0;

  return {
    provider: {
      translate: async (input, request) => {
        calls += 1;
        probe.onRequest?.(request);
        await probe.onTranslate?.(request.targetLng);
        if (failFor.has(request.targetLng)) {
          throw new Error(`provider unavailable for ${request.targetLng}`);
        }
        return await base.translate(input, request);
      },
    },
    count: () => calls,
  };
}

async function tearDown(
  dir: string,
  payload: Payload,
  dropNamespace: () => Promise<void>
): Promise<void> {
  // Before `payload.db.destroy()` below: dropping the namespace needs the connection destroy closes.
  try {
    await dropNamespace();
  } catch (error) {
    // Loud on purpose. A silent failure here leaks a schema or database per boot, and with one
    // boot per spec file that is invisible until the server is full of them.
    const reason = error instanceof Error ? error.message : String(error);
    console.warn(`[bootTestPayload] could not drop the test namespace: ${reason}`);
  }
  try {
    await payload.db.destroy?.();
  } catch {
    /* best-effort */
  }
  rmSync(dir, { recursive: true, force: true });
}

/**
 * Boot a real Payload for integration tests — translator-scoped (one caller today; the headless boot
 * mechanics are structured to lift into a shared helper if a second plugin ever needs them).
 *
 * Design decisions that make the boot deterministic and headless (the load-bearing part):
 * - **Fresh namespace per boot** — a temp SQLite file, a Postgres schema or a Mongo database keyed by
 *   `runId` (see `resolveTestDbAdapter`), so schema `push` is a clean CREATE with no data-loss branch
 *   — Payload never drops to the interactive "accept data loss?" prompt that would hang an
 *   unattended/headless run. `cleanup()` drops the namespace and removes the temp dir even on failure.
 * - **One boot per process:** `getPayload` caches, so a second `bootTestPayload` in the same spec
 *   file returns the first — a case that needs its own boot needs its own file.
 * - **Sync runner:** a translation runs INLINE inside the triggering `afterChange`, so it is complete
 *   when the awaited `payload.update`/`create` resolves — no job autorun, no polling, no async race
 *   in the specs.
 * - **Two in-process triggers:** the `/translate/enqueue` route via `callEndpoint`, and — when
 *   `autoTranslate` is set — a source-locale publish firing the plugin's `afterChange` hook.
 *   Both run the real pipeline through the local API, with no HTTP layer.
 */
export async function bootTestPayload(opts?: BootOptions): Promise<TestPayload> {
  const dir = mkdtempSync(join(tmpdir(), "translator-int-"));
  const { db, drop } = createTestDatabase(join(dir, "test.db"));

  const collections = opts?.collections ?? buildTestCollections();
  const autoTranslate = opts?.autoTranslate;
  if (autoTranslate && !collections.some((c) => c.slug === "docs")) {
    throw new Error("bootTestPayload: autoTranslate needs a `docs` collection in the set");
  }
  const managed: CollectionConfig[] = autoTranslate
    ? collections.map((c) => (c.slug === "docs" ? withAutoTranslate(c, autoTranslate) : c))
    : collections;

  const { provider, count } = countingProvider(opts ?? {});

  const config = await buildConfig({
    secret: "integration-test-secret",
    db,
    editor: lexicalEditor(),
    // Quiet the boot: no telemetry, no admin bundle needed for local-API tests.
    telemetry: false,
    // A Mongo boot regenerates the committed `src/payload-types.ts` with string ids, dirtying the tree.
    typescript: { autoGenerate: false },
    localization: {
      defaultLocale: "en",
      fallback: opts?.fallback ?? false,
      locales: [
        { code: "en", label: "English" },
        { code: "de", label: "Deutsch" },
        { code: "fr", label: "Français" },
        // Three targets, not two: with two, the failing locale is always the last and "stopped at
        // the failure" is unobservable.
        { code: "es", label: "Español" },
      ],
    },
    collections: [...collections, ...(opts?.unmanagedCollections ?? [])],
    ...(opts?.blocks ? { blocks: opts.blocks } : {}),
    jobs: {
      // Payload deletes completed jobs by default, leaving the status panels nothing to read.
      deleteJobOnComplete: opts?.deleteJobOnComplete ?? false,
      enableConcurrencyControl: opts?.exclusiveQueue ?? process.env.EXCLUSIVE_QUEUE === "1",
    },
    plugins: [
      translatorPlugin({
        collections: managed,
        access: new AnyAccessGuard(),
        translationProvider: provider,
        runner: opts?.runner ?? createSyncRunner(),
        modules: opts?.fieldSurface
          ? [documentTranslation(), fieldTranslation()]
          : [documentTranslation()],
        components: [translateDocumentControl()],
        provenance: true,
        ...(opts?.lifecycle ? { lifecycle: opts.lifecycle } : {}),
        ...(opts?.failedWindowMs === undefined ? {} : { failedWindowMs: opts.failedWindowMs }),
      }),
    ],
  });

  const payload = await getPayload({ config });

  return {
    payload,
    cleanup: () => tearDown(dir, payload, () => drop(payload)),
    translateCount: count,
  };
}
