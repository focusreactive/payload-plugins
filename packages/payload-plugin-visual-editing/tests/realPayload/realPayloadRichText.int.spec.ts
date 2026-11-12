import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Pages } from "../support/richTextPages";

import { shapeOf } from "../../src/shared/richText/shapeOf";
import { fieldAddressOf } from "../../src/shared/veDocument";

import { metaAt, valueAt } from "../support/markedData";
import { START_TIMEOUT_MS, startRealPayload } from "../support/realPayload";
import {
  ARTICLE_TEXT_NODES,
  nodeMarkersOf,
  page,
  readMarked,
  readStored,
  seedPages,
  textOf,
} from "../support/richTextPages";

const shapeOfMarker = (marker: unknown) => (marker as { shape?: string }).shape;

describe("the rich text of a draft read through Payload with instantPreview", () => {
  let payload: Payload;
  let pages: Pages;
  let landing: unknown;

  beforeAll(async () => {
    payload = await startRealPayload({ name: "rich-text-live", plugin: { instantPreview: true } });
    pages = await seedPages(payload);
    landing = await readMarked(payload, pages.landing);
  }, START_TIMEOUT_MS);

  afterAll(() => payload.destroy());

  it("stamps the rich text of every document of a find with the shape of its own field", async () => {
    const { docs } = await payload.find({
      collection: "pages",
      depth: 0,
      draft: true,
      sort: "createdAt",
    });
    const storedBody = async (id: string) => valueAt(await readStored(payload, id), "body");
    const expectedShapes = await Promise.all(
      docs.map(async ({ id }) =>
        shapeOf(await storedBody(String(id)), fieldAddressOf(page(String(id)), "body"))
      )
    );

    const shapesRead = docs.map((doc) => [
      ...new Set(nodeMarkersOf(doc.body).flatMap(({ markers }) => markers.map(shapeOfMarker))),
    ]);

    expect(docs.map(({ id }) => String(id))).toEqual([pages.linked, pages.landing, pages.article]);
    expect(shapesRead).toEqual(expectedShapes.map((shape) => [shape]));
    expect(new Set(expectedShapes).size).toBe(docs.length);
  });

  it("stamps the rich text of a global and addresses it without a document id", async () => {
    const inSettings = { collectionSlug: "settings", kind: "global" } as const;
    const storedSettings = await payload.findGlobal({
      context: { visualEditing: false },
      depth: 0,
      slug: "settings",
    });
    const shape = shapeOf(storedSettings.footnote, fieldAddressOf(inSettings, "footnote"));

    const settings = await payload.findGlobal({
      context: { visualEditing: true },
      depth: 0,
      slug: "settings",
    });

    expect(nodeMarkersOf(settings.footnote)).toEqual(
      ARTICLE_TEXT_NODES.map(({ address, text }) => ({
        address,
        markers: [{ node: address, shape }],
        text,
      }))
    );
    expect(metaAt(settings, "footnote")).toEqual({
      ...inSettings,
      path: "footnote",
      terminal: true,
    });
  });

  it("strips the markers again when the document is saved with marked text", async () => {
    const markedBody = { root: valueAt(landing, "body.root") };

    await payload.update({
      collection: "pages",
      data: { body: markedBody, title: "Landing saved" },
      draft: true,
      id: pages.landing,
    });

    expect(textOf(landing, "body")).not.toBe("Body");
    expect(textOf(await readStored(payload, pages.landing), "body")).toBe("Body");
  });
});
