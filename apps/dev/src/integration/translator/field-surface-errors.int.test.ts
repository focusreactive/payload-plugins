import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bootTestPayload } from "./bootTestPayload";
import type { TestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";

// The four situations `POST /translate/field` answers with an HTTP error. Only the status is
// asserted: the contract fixes the codes and says nothing about the error bodies.

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

const MAX_FIELD_VALUE_BYTES = 256 * 1024;

const post = (ctx: TestPayload, body: Record<string, unknown>) =>
  callEndpoint(ctx.payload, "post", "/translate/field", { body });

const paragraph = (text: string) => ({
  root: {
    type: "root",
    children: [
      {
        type: "paragraph",
        children: [
          { type: "text", text, format: 0, detail: 0, mode: "normal", style: "", version: 1 },
        ],
        format: "",
        indent: 0,
        version: 1,
        direction: "ltr",
      },
    ],
    format: "",
    indent: 0,
    version: 1,
    direction: "ltr",
  },
});

describe("per-field translation — the errors that stay errors", () => {
  let ctx: TestPayload;
  let id: string;
  let oversizedId: string;
  let oversizedBytes: number;
  let underCapId: string;
  let underCapBytes: number;

  beforeAll(async () => {
    ctx = await bootTestPayload({ fieldSurface: true });
    const create = ctx.payload.create.bind(ctx.payload) as unknown as CreateDoc;

    const created = await create({
      collection: "docs",
      locale: "en",
      data: { title: "Error source" },
    });
    id = String(created.id);

    // Rich text, not `title`: Payload validates a text field's length, so an oversized string
    // never reaches the endpoint under test.
    const oversized = await create({
      collection: "docs",
      locale: "en",
      data: { title: "Oversized", body: paragraph("x".repeat(MAX_FIELD_VALUE_BYTES + 10_000)) },
    });
    oversizedId = String(oversized.id);
    oversizedBytes = new TextEncoder().encode(
      JSON.stringify(paragraph("x".repeat(MAX_FIELD_VALUE_BYTES + 10_000)))
    ).length;

    const underCap = await create({
      collection: "docs",
      locale: "en",
      data: { title: "Under cap", body: paragraph("y".repeat(100_000)) },
    });
    underCapId = String(underCap.id);
    underCapBytes = new TextEncoder().encode(JSON.stringify(paragraph("y".repeat(100_000)))).length;
  });

  afterAll(async () => {
    await ctx?.cleanup();
  });

  it("rejects a body missing a required field with 400", async () => {
    const res = await post(ctx, {
      collection_slug: "docs",
      field_path: "title",
      source_lng: "en",
      doc_id: id,
    });
    expect(res.status).toBe(400);
  });

  it("rejects a body whose field_path is empty with 400", async () => {
    const res = await post(ctx, {
      collection_slug: "docs",
      field_path: "",
      target_lng: "de",
      source_lng: "en",
      doc_id: id,
    });
    expect(res.status).toBe(400);
  });

  it("rejects a collection the plugin does not manage with 400", async () => {
    const res = await post(ctx, {
      collection_slug: "ghosts",
      field_path: "title",
      target_lng: "de",
      source_lng: "en",
      doc_id: id,
    });
    expect(res.status).toBe(400);
  });

  it("rejects a path that names no field in the collection with 400", async () => {
    const res = await post(ctx, {
      collection_slug: "docs",
      field_path: "nosuchfield",
      target_lng: "de",
      source_lng: "en",
      doc_id: id,
    });
    expect(res.status).toBe(400);
  });

  it("rejects a saved value over MAX_FIELD_VALUE_BYTES with 413", async () => {
    // The fixture has to actually exceed the cap, or a 200 here would read as a missing guard.
    expect(oversizedBytes).toBeGreaterThan(MAX_FIELD_VALUE_BYTES);

    const res = await post(ctx, {
      collection_slug: "docs",
      field_path: "body",
      target_lng: "de",
      source_lng: "en",
      doc_id: oversizedId,
    });
    expect(res.status).toBe(413);
  });

  it("translates a large saved value that stays under the cap", async () => {
    expect(underCapBytes).toBeLessThan(MAX_FIELD_VALUE_BYTES);

    const res = await post(ctx, {
      collection_slug: "docs",
      field_path: "body",
      target_lng: "de",
      source_lng: "en",
      doc_id: underCapId,
    });
    expect(res.status).toBe(200);
    expect((res.data as { data: Reply }).data.status).toBe("translated");
  });
});
