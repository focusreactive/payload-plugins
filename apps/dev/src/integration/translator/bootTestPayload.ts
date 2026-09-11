import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { lexicalEditor } from "@payloadcms/richtext-lexical";
import {
  createTranslationProvider,
  createSyncRunner,
  documentLevel,
  translatorPlugin,
  withAutoTranslate,
} from "@focus-reactive/payload-plugin-translator";
import type {
  TaskRunnerProvider,
  TranslationProvider,
} from "@focus-reactive/payload-plugin-translator";
import { buildConfig } from "payload";
import type { CollectionConfig, Payload } from "payload";
import { getPayload } from "payload";

import { createTestDatabase } from "../../lib/database/resolveAdapter";
import { fakeComplete } from "../../lib/translator/fakeComplete";
import type { FakeTranslationOptions } from "../../lib/translator/fakeComplete";
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
 *   `opts.autoTranslate` is set — a source-locale publish firing the plugin's `afterChange` hook.
 *   Both run the real pipeline through the local API, with no HTTP layer.
 *
 * @param opts.autoTranslate - stamped onto the `docs` collection. Omit it and nothing translates on
 *   publish; the enqueue route still works.
 * @param opts.collections - replaces the shared fixture set entirely (not merged). The set must
 *   still contain a `docs` collection when `autoTranslate` is passed.
 * @param opts.failFor - target locales the fake provider should throw for, so a spec can exercise a
 *   partial failure. Every other locale translates normally.
 * @param opts.runner - defaults to the sync runner. `createPayloadJobsRunner({ autoRun: false })`
 *   leaves queued jobs unprocessed in `payload-jobs`, so a spec can read the rows.
 * @param opts.onTranslate - awaited before each provider call, so a spec can hold a locale mid-run.
 * @param opts.exclusiveQueue - Payload's `enableConcurrencyControl` for this boot; defaults to
 *   `EXCLUSIVE_QUEUE=1`.
 * @param opts.fallback - localization fallback, off by default: an unwritten locale reads as
 *   empty, not as the default locale's text. Localization-level, so it applies to the whole boot.
 */
export async function bootTestPayload(opts?: {
  autoTranslate?: { targets: string[]; strategy?: "overwrite" | "skip_existing" };
  collections?: CollectionConfig[];
  fallback?: boolean;
  exclusiveQueue?: boolean;
  failFor?: string[];
  onTranslate?: (targetLng: string) => Promise<void> | void;
  runner?: TaskRunnerProvider;
  /** Turn on container-granular rich-text translation, and declare the provider able to keep marks. */
  inlineMarks?: boolean;
  /**
   * Whether the provider declares `capabilities.inlineMarks`. Defaults to `inlineMarks`; set it to
   * `false` with the flag on to stand in for a third-party provider that cannot keep marks.
   */
  declareCapability?: boolean;
  /** How the fake answers a marked value — reorder by default, keep order, or corrupt it. */
  fake?: FakeTranslationOptions;
}): Promise<TestPayload> {
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

  const declaresMarks = opts?.declareCapability ?? opts?.inlineMarks ?? false;
  const baseProvider = createTranslationProvider({
    complete: fakeComplete(opts?.fake),
    ...(declaresMarks ? { capabilities: { inlineMarks: true } } : {}),
  });
  const failFor = new Set(opts?.failFor);
  let translateCalls = 0;
  const countingProvider: TranslationProvider = {
    ...(declaresMarks ? { capabilities: { inlineMarks: true } } : {}),
    translate: async (input, sourceLng, targetLng, options) => {
      translateCalls += 1;
      await opts?.onTranslate?.(targetLng);
      if (failFor.has(targetLng)) throw new Error(`provider unavailable for ${targetLng}`);
      return await baseProvider.translate(input, sourceLng, targetLng, options);
    },
  };

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
    collections,
    jobs: {
      // Payload deletes completed jobs by default, leaving the status panels nothing to read.
      deleteJobOnComplete: false,
      enableConcurrencyControl: opts?.exclusiveQueue ?? process.env.EXCLUSIVE_QUEUE === "1",
    },
    plugins: [
      translatorPlugin({
        collections: managed,
        translationProvider: countingProvider,
        runner: opts?.runner ?? createSyncRunner(),
        levels: [documentLevel()],
        provenance: true,
        ...(opts?.inlineMarks ? { experimental: { inlineMarks: true } } : {}),
      }),
    ],
  });

  const payload = await getPayload({ config });

  const cleanup = async () => {
    // Before `payload.db.destroy()` below: dropping the namespace needs the connection destroy closes.
    try {
      await drop(payload);
    } catch (error) {
      // Loud on purpose. A silent failure here leaks a schema or database per boot, and with one
      // boot per spec file that is invisible until the server is full of them.
      console.warn(
        `[bootTestPayload] could not drop the test namespace: ${(error as Error).message}`
      );
    }
    try {
      await payload.db.destroy?.();
    } catch {
      /* best-effort */
    }
    rmSync(dir, { recursive: true, force: true });
  };

  return { payload, cleanup, translateCount: () => translateCalls };
}
