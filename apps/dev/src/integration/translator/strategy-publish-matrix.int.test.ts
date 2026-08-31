import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { sqliteAdapter } from "@payloadcms/db-sqlite";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import {
  createSyncRunner,
  createTranslationProvider,
  documentLevel,
  translatorPlugin,
} from "@focus-reactive/payload-plugin-translator";
import { buildConfig, getPayload } from "payload";
import type { CollectionConfig, Payload } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { reverseComplete } from "../../lib/translator/fakeComplete";
import { callEndpoint } from "./callEndpoint";

// The two per-run choices an editor makes in the same form — `strategy` and publish-on-translation —
// are independent, so all four combinations are reachable in two clicks. They interact, because a
// collection with drafts has two layers and an existing translation may sit in either one. This
// walks that full matrix; before it existed, only the four published-layer rows were covered and
// every defect of #102 and #116 lived in the uncovered half.
//
// ONE boot per file: `getPayload` caches its instance globally.
// Fallbacks OFF: otherwise an unpublished locale reads back as the source text and "not live"
// cannot be told from "translated".

const SOURCE = "Hello world";
const MACHINE = [...SOURCE].reverse().join("");
const REVIEWED = "REVIEWED BY A HUMAN";

let payload: Payload;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), "matrix-"));
  const collections: CollectionConfig[] = [
    { slug: "users", auth: true, fields: [] },
    {
      slug: "docs",
      versions: { drafts: true },
      fields: [{ name: "title", type: "text", localized: true }],
    },
  ];
  const config = await buildConfig({
    secret: "matrix-secret",
    db: sqliteAdapter({ client: { url: `file:${join(tmpDir, "test.db")}` } }),
    editor: lexicalEditor(),
    telemetry: false,
    localization: {
      defaultLocale: "en",
      fallback: false,
      locales: [
        { code: "en", label: "English" },
        { code: "de", label: "Deutsch" },
      ],
    },
    collections,
    plugins: [
      translatorPlugin({
        collections,
        translationProvider: createTranslationProvider({ complete: reverseComplete }),
        runner: createSyncRunner(),
        levels: [documentLevel()],
      }),
    ],
  });
  payload = await getPayload({ config });
});

afterAll(async () => {
  try {
    await payload?.db?.destroy?.();
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

const read = (id: string, draft: boolean) =>
  payload.findByID({
    collection: "docs",
    id,
    locale: "de" as "en",
    draft,
    fallbackLocale: false,
  }) as Promise<Record<string, unknown>>;

/** Create a published document whose German locale already holds `REVIEWED`, in one layer or the other. */
async function seed(where: "published" | "draft"): Promise<string> {
  const doc = await payload.create({
    collection: "docs",
    locale: "en",
    data: { title: SOURCE, _status: "published" },
  });
  const id = String(doc.id);
  await payload.update({
    collection: "docs",
    id,
    locale: "de" as "en",
    ...(where === "draft" ? { draft: true } : {}),
    data: { title: REVIEWED },
  });
  return id;
}

const translate = async (
  id: string,
  strategy: "overwrite" | "skip_existing",
  publish: boolean
): Promise<void> => {
  const res = await callEndpoint(payload, "post", "/translate/enqueue", {
    body: {
      source_lng: "en",
      target_lng: "de",
      collection_slug: "docs",
      collection_id: [id],
      strategy,
      publish_on_translation: publish,
    },
  });
  expect(res.status).toBe(200);
};

describe("strategy x publish-on-translation", () => {
  describe("the existing translation is published", () => {
    it("overwrite without publishing: replaces it in the draft, leaves the live value alone", async () => {
      const id = await seed("published");
      await translate(id, "overwrite", false);

      expect((await read(id, false)).title).toBe(REVIEWED);
      expect((await read(id, true)).title).toBe(MACHINE);
    });

    it("overwrite with publishing: replaces it in both layers", async () => {
      const id = await seed("published");
      await translate(id, "overwrite", true);

      expect((await read(id, false)).title).toBe(MACHINE);
      expect((await read(id, true)).title).toBe(MACHINE);
    });

    it("skip_existing without publishing: leaves it alone", async () => {
      const id = await seed("published");
      await translate(id, "skip_existing", false);

      expect((await read(id, false)).title).toBe(REVIEWED);
      expect((await read(id, true)).title).toBe(REVIEWED);
    });

    it("skip_existing with publishing: leaves it alone", async () => {
      const id = await seed("published");
      await translate(id, "skip_existing", true);

      expect((await read(id, false)).title).toBe(REVIEWED);
      expect((await read(id, true)).title).toBe(REVIEWED);
    });
  });

  // The half nothing covered before. An existing translation that lives only in the draft is
  // invisible to the published layer, so every rule about which layer answers which question
  // shows up here and nowhere else.
  describe("the existing translation is a draft awaiting review", () => {
    it("overwrite without publishing: replaces it, and nothing goes live", async () => {
      const id = await seed("draft");
      await translate(id, "overwrite", false);

      expect((await read(id, false)).title).toBeUndefined();
      expect((await read(id, true)).title).toBe(MACHINE);
    });

    it("overwrite with publishing: replaces it and publishes the replacement", async () => {
      const id = await seed("draft");
      await translate(id, "overwrite", true);

      expect((await read(id, false)).title).toBe(MACHINE);
      expect((await read(id, true)).title).toBe(MACHINE);
    });

    it("skip_existing without publishing: keeps the reviewer's text, publishes nothing", async () => {
      const id = await seed("draft");
      await translate(id, "skip_existing", false);

      expect((await read(id, false)).title).toBeUndefined();
      expect((await read(id, true)).title).toBe(REVIEWED);
    });

    // The case both #102 and #116 were about. "Already translated" has to mean "exists anywhere",
    // not "exists in the layer being written" — otherwise publishing re-translates over a text a
    // human approved. And having skipped it, the run must still carry it into the publish, or the
    // editor's request does nothing at all.
    it("skip_existing with publishing: publishes the reviewer's text rather than re-translating it", async () => {
      const id = await seed("draft");
      await translate(id, "skip_existing", true);

      expect((await read(id, false)).title).toBe(REVIEWED);
      expect((await read(id, true)).title).toBe(REVIEWED);
    });
  });
});
