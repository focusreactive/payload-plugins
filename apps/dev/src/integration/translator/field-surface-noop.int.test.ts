import { withFieldTranslation } from "@focus-reactive/payload-plugin-translator";
import type { Block, CollectionConfig } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// The five reasons `POST /translate/field` answers with `200` + `status: "noop"` instead of an
// error. One collection carries every shape that produces one, because a spec file may boot
// Payload only once.

type Notice = { level: string; reason: string; message: string };
type Reply = { status: string; value: unknown; notice?: Notice };

/**
 * `surface` is declared by this spec rather than by the app, so Payload's generated slug and data
 * types do not know it. Named signatures say what these calls take instead.
 */
type CreateDoc = (args: {
  collection: string;
  locale: string;
  data: Record<string, unknown>;
}) => Promise<{ id: string | number }>;

type UpdateDoc = (args: {
  collection: string;
  id: string;
  locale: string;
  data: Record<string, unknown>;
}) => Promise<unknown>;

type FindDoc = (args: {
  collection: string;
  id: string;
  locale: string;
}) => Promise<Record<string, unknown>>;

/** Lives under a NON-localized `blocks` field, so its leaf carries the per-locale value itself. */
const heroBlock: Block = {
  slug: "hero",
  fields: [{ name: "heading", type: "text", localized: true }],
};

/** Lives under a LOCALIZED `blocks` field, which owns the per-locale split for the whole row. */
const cardBlock: Block = {
  slug: "card",
  fields: [{ name: "heading", type: "text" }],
};

const buildSurfaceCollections = (): CollectionConfig[] => [
  { slug: "users", auth: true, fields: [] },
  {
    slug: "surface",
    fields: [
      { name: "title", type: "text", localized: true },
      // Localized and populated in `en`, so only its type can disqualify it.
      { name: "views", type: "number", localized: true },
      withFieldTranslation({ name: "secret", type: "text", localized: true }, { exclude: true }),
      { name: "sections", type: "blocks", blocks: [heroBlock] },
      { name: "cards", type: "blocks", localized: true, blocks: [cardBlock] },
      { name: "rows", type: "array", localized: true, fields: [{ name: "label", type: "text" }] },
      {
        name: "stats",
        type: "group",
        fields: [
          withFieldTranslation({ name: "note", type: "text", localized: true }, { exclude: true }),
        ],
      },
    ],
  },
];

const EN = {
  // `title` is deliberately absent: the "holds nothing in the source locale" case.
  views: 42,
  secret: "classified",
  sections: [],
  cards: [{ blockType: "card", heading: "Card one" }],
  rows: [{ label: "Row one" }],
  stats: { note: "Only note" },
};

const CASES = {
  empty: "title",
  untranslatableType: "views",
  excluded: "secret",
  blocksWithoutRow: "sections.0.heading",
  localizedBlocks: "cards.0.heading",
  localizedArray: "rows.0.label",
  nothingInTheSubtree: "stats",
} as const;

type CaseName = keyof typeof CASES;
type Sent = { status: number; reply: Reply };

describe("per-field translation — the reasons a noop is a noop", () => {
  let ctx: TestPayload;
  let id: string;
  let replies: Record<CaseName, Sent>;

  beforeAll(async () => {
    ctx = await bootTestPayload({ fieldSurface: true, collections: buildSurfaceCollections() });

    const create = ctx.payload.create.bind(ctx.payload) as unknown as CreateDoc;
    const update = ctx.payload.update.bind(ctx.payload) as unknown as UpdateDoc;
    const created = await create({ collection: "surface", locale: "en", data: EN });
    id = String(created.id);
    // `de` holds a title while `en` does not, so "the field holds nothing" is judged per locale.
    await update({
      collection: "surface",
      id,
      locale: "de",
      data: { title: "Vorhandener Titel" },
    });

    const collected: Partial<Record<CaseName, Sent>> = {};
    for (const [name, fieldPath] of Object.entries(CASES) as [CaseName, string][]) {
      const res = await callEndpoint(ctx.payload, "post", "/translate/field", {
        body: {
          collection_slug: "surface",
          field_path: fieldPath,
          target_lng: "de",
          source_lng: "en",
          doc_id: id,
        },
      });
      collected[name] = { status: res.status, reply: (res.data as { data: Reply }).data };
    }
    replies = collected as Record<CaseName, Sent>;
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("a field holding nothing in the source locale is a noop with an info notice", () => {
    const { status, reply } = replies.empty;
    expect(status).toBe(200);
    expect(reply.status).toBe("noop");
    expect(reply.notice).toEqual({
      level: "info",
      reason: "nothing-translatable",
      message: expect.any(String),
    });
  });

  it("a field whose type is not one the plugin translates is a noop with an info notice", () => {
    const { status, reply } = replies.untranslatableType;
    expect(status).toBe(200);
    expect(reply).toEqual({
      status: "noop",
      value: 42,
      notice: { level: "info", reason: "not-translatable", message: expect.any(String) },
    });
  });

  it("an excluded field is a noop with an info notice", () => {
    const { status, reply } = replies.excluded;
    expect(status).toBe(200);
    expect(reply).toEqual({
      status: "noop",
      value: "classified",
      notice: { level: "info", reason: "excluded", message: expect.any(String) },
    });
  });

  it("a path into blocks the saved document has no row for is a noop with an info notice", () => {
    const { status, reply } = replies.blocksWithoutRow;
    expect(status).toBe(200);
    expect(reply.status).toBe("noop");
    expect(reply.notice).toEqual({
      level: "info",
      reason: "block-unresolved",
      message: expect.any(String),
    });
  });

  it("a path through a localized blocks field is a noop with a warning notice", () => {
    const { status, reply } = replies.localizedBlocks;
    expect(status).toBe(200);
    expect(reply).toEqual({
      status: "noop",
      value: "Card one",
      notice: { level: "warning", reason: "localized-list", message: expect.any(String) },
    });
  });

  it("a path through a localized array is a noop with a warning notice", () => {
    const { status, reply } = replies.localizedArray;
    expect(status).toBe(200);
    expect(reply).toEqual({
      status: "noop",
      value: "Row one",
      notice: { level: "warning", reason: "localized-list", message: expect.any(String) },
    });
  });

  // A container named directly by the path is judged by its own type, not by what it holds — so a
  // group whose only leaf is excluded answers `not-translatable`, the same as a number field would.
  it("a container named by the path is judged by its own type", () => {
    const { status, reply } = replies.nothingInTheSubtree;
    expect(status).toBe(200);
    expect(reply.status).toBe("noop");
    expect(reply.notice).toEqual({
      level: "info",
      reason: "not-translatable",
      message: expect.any(String),
    });
  });

  it("writes nothing — the document is unchanged in every locale", async () => {
    // First that every request was answered at all: an endpoint that fails outright also leaves
    // the document untouched, and without this the check cannot tell the two apart.
    expect(Object.values(replies).map((r) => r.status)).toEqual(Object.keys(CASES).map(() => 200));

    const find = ctx.payload.findByID.bind(ctx.payload) as unknown as FindDoc;

    const en = await find({ collection: "surface", id, locale: "en" });
    expect(en.title ?? null).toBeNull();
    expect(en.views).toBe(42);
    expect(en.secret).toBe("classified");
    expect((en.cards as { heading: string }[]).map((c) => c.heading)).toEqual(["Card one"]);
    expect((en.rows as { label: string }[]).map((r) => r.label)).toEqual(["Row one"]);
    expect((en.stats as { note: string }).note).toBe("Only note");

    const de = await find({ collection: "surface", id, locale: "de" });
    expect(de.title).toBe("Vorhandener Titel");

    const fr = await find({ collection: "surface", id, locale: "fr" });
    expect(fr.title ?? null).toBeNull();
  });
});
