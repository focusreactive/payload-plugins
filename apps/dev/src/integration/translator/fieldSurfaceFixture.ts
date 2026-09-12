import type { Payload } from "payload";

import { callEndpoint } from "./callEndpoint";
import type { TestPayload } from "./bootTestPayload";

/** Lexical's format bitfield, for the one bit these specs care about. */
export const BOLD = 1;
export const UNFORMATTED = 0;

const text = (value: string, format = UNFORMATTED) => ({
  type: "text",
  text: value,
  format,
  detail: 0,
  mode: "normal",
  style: "",
  version: 1,
});

const richText = (children: unknown[]) => ({
  root: {
    type: "root",
    children: [
      {
        type: "paragraph",
        children,
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

const source = () => richText([text("a "), text("red", BOLD), text(" car")]);

type Child = { type: string; text?: string; format?: number };

const piecesOf = (value: unknown): [string | undefined, number | undefined][] => {
  const children =
    (value as { root?: { children?: { children?: Child[] }[] } })?.root?.children?.[0]?.children ??
    [];
  return children.map((c) => [c.text, c.format]);
};

/**
 * `docs` is declared by the test collections rather than by the app, so Payload's generated slug
 * and data types do not know it. A named signature says what this call takes instead.
 */
type CreateDoc = (args: {
  collection: string;
  locale: string;
  data: Record<string, unknown>;
}) => Promise<{ id: string | number }>;

/**
 * Create a paragraph of three fragments, translate its field through `POST /translate/field`, and
 * return the reply's pieces as `[text, format]` pairs.
 *
 * A fresh value per call: `payload.create` writes ids into the object it is handed.
 */
export const translateField = async (
  ctx: TestPayload
): Promise<[string | undefined, number | undefined][]> => {
  const create = (ctx.payload as Payload).create as unknown as CreateDoc;
  const created = await create({
    collection: "docs",
    locale: "en",
    data: { title: "Field surface source", body: source() },
  });

  const res = await callEndpoint(ctx.payload, "post", "/translate/field", {
    body: {
      collection_slug: "docs",
      field_path: "body",
      target_lng: "de",
      source_lng: "en",
      doc_id: String(created.id),
    },
  });

  const reply = (res.data as { data: { status: string; value: unknown } }).data;
  if (res.status !== 200 || reply.status !== "translated") {
    throw new Error(`field translation did not happen: ${res.status} ${JSON.stringify(res.data)}`);
  }
  return piecesOf(reply.value);
};

/** What every fall-back path returns here: the source order, each fragment translated in place. */
export const SOURCE_ORDER: [string, number][] = [
  ["de:a ", UNFORMATTED],
  ["de:red", BOLD],
  ["de: car", UNFORMATTED],
];
