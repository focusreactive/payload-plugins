import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bootTestPayload } from "./bootTestPayload";
import { callEndpoint } from "./callEndpoint";
import type { TestPayload } from "./bootTestPayload";

/**
 * The per-field translate control with the mode OFF — the control for its sibling spec.
 *
 * Every other mark spec drives the document surface. These exist because the two surfaces reach
 * `translateContent` down different wiring, and only one of them was ever exercised — so the field
 * route could accept the option, drop it, and stay green everywhere.
 *
 * The endpoint returns the translated value instead of saving it, so this reads the reply rather
 * than the document. One boot per file, as everywhere in this suite.
 */

const text = (value: string, format = 0) => ({
  type: "text",
  text: value,
  format,
  detail: 0,
  mode: "normal",
  style: "",
  version: 1,
});

const paragraph = (children: unknown[]) => ({
  type: "paragraph",
  children,
  format: "",
  indent: 0,
  version: 1,
  direction: "ltr",
});

const richText = (children: unknown[]) => ({
  root: {
    type: "root",
    children: [paragraph(children)],
    format: "",
    indent: 0,
    version: 1,
    direction: "ltr",
  },
});

type Child = { type: string; text?: string; format?: number };

const piecesOf = (value: unknown): [string | undefined, number | undefined][] => {
  const children =
    (value as { root?: { children?: { children?: Child[] }[] } })?.root?.children?.[0]?.children ??
    [];
  return children.map((c) => [c.text, c.format]);
};

/**
 * `a `, **red**, ` car` — three fragments whose reversal is visible and whose formats can be
 * traced. Built per call: `payload.create` writes ids into the value it is handed, so a shared
 * object survives only its first boot.
 */
const source = () => richText([text("a "), text("red", 1), text(" car")]);

const translateField = async (ctx: TestPayload) => {
  const created = await ctx.payload.create({
    collection: "docs" as "pages",
    locale: "en",
    data: { title: "Field surface source", body: source() } as never,
  });

  const res = await callEndpoint(ctx.payload, "post", "/translate/field", {
    body: {
      collection_slug: "docs",
      field_path: "body",
      target_lng: "de",
      source_lng: "en",
      doc_id: String((created as { id: string | number }).id),
    },
  });

  expect(res.status).toBe(200);
  const reply = (res.data as { data: { status: string; value: unknown } }).data;
  expect(reply.status).toBe("translated");
  return piecesOf(reply.value);
};

describe("per-field translation, the mode off", () => {
  let ctx: TestPayload;

  beforeAll(async () => {
    ctx = await bootTestPayload({ fieldSurface: true });
  });

  afterAll(async () => {
    await ctx.cleanup();
  });

  // Without this the "mode on" spec would also pass on a build that ignores the option, as long as
  // something else reordered the pieces.
  it("keeps source order, translating node by node", async () => {
    expect(await translateField(ctx)).toEqual([
      ["de:a ", 0],
      ["de:red", 1],
      ["de: car", 0],
    ]);
  });
});
