import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import {
  createOpenAIProvider,
  createSyncRunner,
  documentLevel,
  translatorPlugin,
  withAutoTranslate,
} from "@focus-reactive/payload-plugin-translator";
import type { TranslationProvider } from "@focus-reactive/payload-plugin-translator";
import { buildConfig } from "payload";
import type { CollectionConfig, Payload } from "payload";
import { getPayload } from "payload";

import { buildTestCollections } from "./testCollections";

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
 * Boot a real Payload for integration tests — translator-scoped (one caller today; the sqlite-headless
 * boot mechanics are structured to lift into a shared helper if a second plugin ever needs them).
 *
 * Design decisions that make the boot deterministic and headless (the load-bearing part):
 * - **Fresh unique sqlite file** under the OS temp dir per boot, so schema `push` is a clean CREATE with
 *   no data-loss branch — Payload never drops to the interactive "accept data loss?" prompt that would
 *   hang an unattended/headless run. `cleanup()` removes the temp dir even on failure.
 * - **Dry-run provider** (deterministic transform, no network / API spend) + **sync runner** (translation
 *   runs INLINE inside the triggering `afterChange`, so a translation is complete when the awaited
 *   `payload.update`/`create` resolves — no job autorun, no polling, no async race in the specs).
 * - **Auto-translate is the in-process trigger:** publishing source-locale content fires the plugin's
 *   `afterChange` hook which (sync) runs the full pipeline and writes the target locales — the same real
 *   path production uses, reachable through the local API without any HTTP layer.
 *
 * @param opts.autoTranslate - per-collection auto-translate config to stamp on the `docs` collection
 *   (targets + strategy). Omit to leave auto-translate off (still translatable via a published change
 *   only when set — specs that need a trigger pass it).
 */
export async function bootTestPayload(opts?: {
  autoTranslate?: { targets: string[]; strategy?: "overwrite" | "skip_existing" };
}): Promise<TestPayload> {
  const dir = mkdtempSync(join(tmpdir(), "translator-int-"));
  const dbPath = join(dir, "test.db");

  const collections = buildTestCollections();
  const docs = collections.find((c) => c.slug === "docs") as CollectionConfig;
  const managed: CollectionConfig[] = opts?.autoTranslate
    ? collections.map((c) => (c.slug === "docs" ? withAutoTranslate(docs, opts.autoTranslate!) : c))
    : collections;

  // Wrap the dry-run provider so every real translate() call is counted (see `translateCount` above).
  const baseProvider = createOpenAIProvider({ apiKey: "", dryRun: true });
  let translateCalls = 0;
  const countingProvider: TranslationProvider = {
    translate: (input, sourceLng, targetLng) => {
      translateCalls += 1;
      return baseProvider.translate(input, sourceLng, targetLng);
    },
  };

  const config = await buildConfig({
    secret: "integration-test-secret",
    // A fresh file per boot → push is a clean create, never the interactive data-loss prompt.
    db: sqliteAdapter({ client: { url: `file:${dbPath}` } }),
    editor: lexicalEditor(),
    // Quiet the boot: no telemetry, no admin bundle needed for local-API tests.
    telemetry: false,
    localization: {
      defaultLocale: "en",
      fallback: false,
      locales: [
        { code: "en", label: "English" },
        { code: "de", label: "Deutsch" },
        { code: "fr", label: "Français" },
      ],
    },
    collections,
    plugins: [
      translatorPlugin({
        collections: managed,
        translationProvider: countingProvider,
        runner: createSyncRunner(),
        levels: [documentLevel()],
        provenance: true,
      }),
    ],
  });

  const payload = await getPayload({ config });

  const cleanup = async () => {
    try {
      await payload.db.destroy?.();
    } catch {
      /* best-effort */
    }
    rmSync(dir, { recursive: true, force: true });
  };

  return { payload, cleanup, translateCount: () => translateCalls };
}
