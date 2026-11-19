import type { Payload, PayloadRequest } from "payload";

import { createLocalReq } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { VeMediaOptions } from "../../src/shared/protocol";
import type { MetaInfo } from "../../src/shared/shared";

import { withVisualEditingPath } from "../../src/client/withVisualEditingPath";
import { fieldKeyOfMarker } from "../../src/shared/fieldKey";
import {
  DATA_VE_KEY_ATTR,
  DATA_VE_PATH_ATTR,
  VE_FIELD_EDIT_PATH,
  VE_MEDIA_OPTIONS_PATH,
} from "../../src/shared/protocol";

import { metaAt, valueAt } from "../support/markedData";
import { START_TIMEOUT_MS, startRealPayload } from "../support/realPayload";
import { page } from "../support/richTextPages";
import { EDITOR, signIn } from "../support/unsavedRichTextRequests";

const POPULATED = 1;

describe("the key of an upload in a draft read with instantPreview", () => {
  let payload: Payload;
  let editor: Headers;
  let harbour: string;
  let lighthouse: string;
  let brochure: string;
  let docId: string;
  let marked: unknown;

  const upload = async (collection: "documents" | "media", name: string) => {
    const created = await payload.create({
      collection,
      data: { alt: name },
      file: { data: Buffer.from(name), mimetype: "text/plain", name, size: name.length },
    });
    return String(created.id);
  };

  const post = async <Body>(path: string, body: object) => {
    const endpoint = payload.config.endpoints.find((candidate) => candidate.path === path);
    const { user } = await payload.auth({ headers: editor });
    const sent = new Headers(editor);
    sent.set("Content-Type", "application/json");
    const req = await createLocalReq(
      { req: { headers: sent } as Partial<PayloadRequest>, user: user ?? undefined },
      payload
    );
    req.text = async () => JSON.stringify({ ...page(docId), locale: "en", ...body });
    const response = (await endpoint!.handler(req)) as Response;
    return { body: (await response.json()) as Body, status: response.status };
  };

  const metaOf = (dataPath: string) => metaAt(marked, dataPath) as MetaInfo;

  const keyAt = (dataPath: string) => fieldKeyOfMarker(metaOf(dataPath));

  const savedAt = async (dataPath: string) => {
    const draft = await payload.findByID({
      collection: "pages",
      context: { visualEditing: false },
      depth: 0,
      draft: true,
      id: docId,
      locale: "en",
    });
    return String(valueAt(draft, dataPath));
  };

  beforeAll(async () => {
    payload = await startRealPayload({
      name: "upload-keys",
      plugin: { inlineEditing: true, instantPreview: true },
    });
    editor = await signIn(payload, EDITOR);
    harbour = await upload("media", "harbour.txt");
    lighthouse = await upload("media", "lighthouse.txt");
    brochure = await upload("documents", "brochure.txt");
    const author = await payload.create({ collection: "authors", data: { name: "Ada" } });
    const created = await payload.create({
      collection: "pages",
      data: {
        _status: "published",
        card: { image: Number(harbour) },
        gallery: [Number(harbour)],
        image: Number(harbour),
        layout: [{ blockType: "hero", heading: "Welcome", image: Number(harbour) }],
        slides: [
          { files: [Number(harbour)] },
          {
            author: author.id,
            eitherFile: { relationTo: "documents", value: Number(brochure) },
            files: [Number(harbour), Number(lighthouse)],
            image: Number(harbour),
          },
        ],
      },
      locale: "en",
    });
    docId = String(created.id);
    marked = await payload.findByID({
      collection: "pages",
      depth: POPULATED,
      draft: true,
      id: docId,
      locale: "en",
    });
  }, START_TIMEOUT_MS);

  afterAll(async () => {
    await payload.destroy();
  });

  it("is the path of an upload at the top level and in a group, without a key in its _meta", () => {
    expect(metaOf("image")).toEqual({ ...page(docId), path: "image", terminal: true });
    expect(metaOf("card.image")).toEqual({ ...page(docId), path: "card.image", terminal: true });
  });

  it("names the row by its id for an upload in an array row and in a block row", () => {
    const slideId = valueAt(marked, "slides.1.id");
    const blockId = valueAt(marked, "layout.0.id");

    expect(metaOf("slides.1.image")).toEqual({
      ...page(docId),
      key: `slides.${slideId}.image`,
      path: "slides.1.image",
      terminal: true,
    });
    expect(metaOf("layout.0.image")).toEqual({
      ...page(docId),
      key: `layout.${blockId}.image`,
      path: "layout.0.image",
      terminal: true,
    });
  });

  it("names the row of a related document in an array row", () => {
    const slideId = valueAt(marked, "slides.1.id");

    expect(metaOf("slides.1.author")).toEqual({
      ...page(docId),
      key: `slides.${slideId}.author`,
      path: "slides.1.author",
      terminal: true,
    });
  });

  it("names the field, not the document, from every document of a hasMany upload in a row", () => {
    const slideId = valueAt(marked, "slides.1.id");
    const ofField = {
      ...page(docId),
      key: `slides.${slideId}.files`,
      path: "slides.1.files",
      terminal: true,
    };

    expect(metaOf("slides.1.files.0")).toEqual(ofField);
    expect(metaOf("slides.1.files.1")).toEqual(ofField);
    expect(metaOf("gallery.0")).toEqual({ ...page(docId), path: "gallery", terminal: true });
  });

  it("names the field from the value of an upload to several collections in a row and from the document in it", () => {
    const slideId = valueAt(marked, "slides.1.id");
    const ofField = {
      ...page(docId),
      key: `slides.${slideId}.eitherFile`,
      path: "slides.1.eitherFile",
      terminal: true,
    };

    expect(metaOf("slides.1.eitherFile")).toEqual(ofField);
    expect(metaOf("slides.1.eitherFile.value")).toEqual(ofField);
  });

  it("reaches the element of the image as data-ve-key", () => {
    const slideId = valueAt(marked, "slides.1.id");

    expect(withVisualEditingPath(valueAt(marked, "slides.1.image"))).toMatchObject({
      [DATA_VE_KEY_ATTR]: `slides.${slideId}.image`,
      [DATA_VE_PATH_ATTR]: "slides.1.image",
    });
    expect(withVisualEditingPath(valueAt(marked, "image"))).not.toHaveProperty(DATA_VE_KEY_ATTR);
  });

  it.each([
    ["at the top level", "image"],
    ["in a group", "card.image"],
    ["in an array row", "slides.1.image"],
    ["in a block row", "layout.0.image"],
  ])("is listed for and saved by the endpoints for an upload %s", async (_name, dataPath) => {
    const key = keyAt(dataPath);

    const listed = await post<VeMediaOptions>(VE_MEDIA_OPTIONS_PATH, { key, page: 1, search: "" });
    const saved = await post<{ saved: boolean }>(VE_FIELD_EDIT_PATH, { key, value: lighthouse });

    expect(listed.status).toBe(200);
    expect(listed.body.collection).toBe("media");
    expect(saved).toEqual({ body: { autosave: false, saved: true }, status: 200 });
    expect(await savedAt(dataPath)).toBe(lighthouse);
  });

  it.each([
    ["a hasMany upload in a row", "slides.1.files.0"],
    ["an upload to several collections in a row", "slides.1.eitherFile"],
    ["a related document in a row", "slides.1.author"],
  ])("is refused by the endpoints for %s", async (_name, dataPath) => {
    const key = keyAt(dataPath);

    const listed = await post<VeMediaOptions>(VE_MEDIA_OPTIONS_PATH, { key, page: 1, search: "" });
    const saved = await post<{ saved: boolean }>(VE_FIELD_EDIT_PATH, { key, value: lighthouse });

    expect(listed.status).toBe(422);
    expect(saved.status).toBe(422);
    expect(saved.body.saved).toBe(false);
  });
});
