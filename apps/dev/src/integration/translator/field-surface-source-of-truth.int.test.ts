import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// The standing guarantees of `POST /translate/field`: the value translated is the one saved in
// `source_lng`, an occupied target is translated again anyway, and the document is left as it was.

type Reply = { status: string; value: unknown };

/**
 * `docs` is declared by the test collections rather than by the app, so Payload's generated slug
 * and data types do not know it. Named signatures say what these calls take instead.
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

describe("per-field translation — where the value comes from and what it leaves behind", () => {
  let ctx: TestPayload;
  let id: string;
  let fromEnglish: { status: number; reply: Reply };
  let fromFrench: { status: number; reply: Reply };
  let ontoOccupiedTarget: { status: number; reply: Reply };

  beforeAll(async () => {
    ctx = await bootTestPayload({ fieldSurface: true });

    const create = ctx.payload.create.bind(ctx.payload) as unknown as CreateDoc;
    const update = ctx.payload.update.bind(ctx.payload) as unknown as UpdateDoc;
    const created = await create({
      collection: "docs",
      locale: "en",
      data: { title: "Saved title", ref: "REF-1" },
    });
    id = String(created.id);
    await update({ collection: "docs", id, locale: "de", data: { title: "Vorhandener Titel" } });
    await update({ collection: "docs", id, locale: "fr", data: { title: "Titre source" } });

    const send = async (sourceLng: string, targetLng: string) => {
      const res = await callEndpoint(ctx.payload, "post", "/translate/field", {
        body: {
          collection_slug: "docs",
          field_path: "title",
          target_lng: targetLng,
          source_lng: sourceLng,
          doc_id: id,
        },
      });
      return { status: res.status, reply: (res.data as { data: Reply }).data };
    };

    fromEnglish = await send("en", "es");
    fromFrench = await send("fr", "es");
    ontoOccupiedTarget = await send("en", "de");
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("translates the value saved in the document, though the request carries none", () => {
    expect(fromEnglish.status).toBe(200);
    expect(fromEnglish.reply).toEqual({ status: "translated", value: "es:Saved title" });
  });

  it("reads the locale named by source_lng, not the default one", () => {
    expect(fromFrench.status).toBe(200);
    expect(fromFrench.reply).toEqual({ status: "translated", value: "es:Titre source" });
  });

  it("always overwrites — a target locale that already holds a value is translated again", () => {
    expect(ontoOccupiedTarget.status).toBe(200);
    expect(ontoOccupiedTarget.reply).toEqual({ status: "translated", value: "de:Saved title" });
  });

  it("writes nothing — the document is unchanged in every locale", async () => {
    // First that all three translations actually happened: a handler that answers nothing also
    // leaves the document untouched, and without this the check cannot tell the two apart.
    expect(
      [fromEnglish, fromFrench, ontoOccupiedTarget].map(
        (r) => (r.reply as { status: string }).status
      )
    ).toEqual(["translated", "translated", "translated"]);

    const find = ctx.payload.findByID.bind(ctx.payload) as unknown as FindDoc;

    const en = await find({ collection: "docs", id, locale: "en" });
    expect(en.title).toBe("Saved title");
    expect(en.ref).toBe("REF-1");

    const de = await find({ collection: "docs", id, locale: "de" });
    expect(de.title).toBe("Vorhandener Titel");

    const fr = await find({ collection: "docs", id, locale: "fr" });
    expect(fr.title).toBe("Titre source");

    const es = await find({ collection: "docs", id, locale: "es" });
    expect(es.title ?? null).toBeNull();
  });
});
