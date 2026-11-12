import type { Access, FieldAccess, Payload, PayloadRequest } from "payload";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { LiveRichTextRequest } from "../../src/shared/protocol";
import type { EditorNode } from "../../src/shared/richText/editorNodes";
import type { Pages } from "../support/richTextPages";

import { isUnsavedRichTextRead, readUnsavedRichText } from "../../src/index";
import { shapeOf } from "../../src/shared/richText/shapeOf";
import { META_KEY } from "../../src/shared/shared";
import { fieldAddressOf } from "../../src/shared/veDocument";

import { metaAt, valueAt } from "../support/markedData";
import {
  richText,
  SHORT_TIME_LIMIT_MS,
  SLOW_READ_MS,
  START_TIMEOUT_MS,
  startRealPayload,
} from "../support/realPayload";
import {
  EDITOR,
  OUTSIDER,
  postOf,
  signIn,
  slowBodyOf,
  streamedPostOf,
  WRITER,
} from "../support/unsavedRichTextRequests";
import {
  article,
  ARTICLE_TEXT_NODES,
  nodeMarkersOf,
  page,
  readMarked,
  readStored,
  seedPages,
  topLevelTypesOf,
} from "../support/richTextPages";
import { waitFor } from "../support/time";

const SETTINGS = { collectionSlug: "settings", kind: "global" } as const;
const NO_HEADERS = new Headers();

let readDelayMs = 0;
let accessReadsThePage = false;
let readsWithTheAccessOfTheUser = false;
let isInsideTheAccessRead = false;
const readsOfUnsavedRichText: boolean[] = [];

const accessOfTheNestedRead = (req: PayloadRequest) =>
  readsWithTheAccessOfTheUser ? { overrideAccess: false, user: req.user } : {};

const readThePageInsideAccess = async (id: number | string, req: PayloadRequest) => {
  isInsideTheAccessRead = true;
  try {
    await req.payload.findByID({
      collection: "pages",
      depth: 0,
      draft: true,
      id,
      req,
      ...accessOfTheNestedRead(req),
    });
  } finally {
    isInsideTheAccessRead = false;
  }
};

const everyoneButTheOutsider: Access = async ({ id, req }) => {
  readsOfUnsavedRichText.push(isUnsavedRichTextRead(req));
  if (accessReadsThePage && id !== undefined && !isInsideTheAccessRead) {
    await readThePageInsideAccess(id, req);
  }
  await waitFor(readDelayMs);
  return req.user?.email !== OUTSIDER.email;
};
const everyoneButTheWriter: Access = ({ req }) => req.user?.email !== WRITER.email;
const editorsOnly: FieldAccess = ({ req }) => req.user?.email === EDITOR.email;

const uploadNode = (mediaId: number) => ({
  fields: null,
  format: "",
  id: "upload-node",
  relationTo: "media",
  type: "upload",
  value: mediaId,
  version: 3,
});

const withNode = (node: object) => {
  const state = article();
  state.root.children.push(node as never);
  return state;
};

const blockNode = (fields: object) => ({ fields, format: "", type: "block", version: 2 });

const metaOf = (content: unknown) => valueAt(content, META_KEY);

describe("an unsaved rich text state read through Payload for the user who edits it", () => {
  let payload: Payload;
  let pages: Pages;
  let photoId: number;
  let editor: Headers;
  let outsider: Headers;
  let writer: Headers;
  let replacesBodyOnRead = false;
  let throwsOnRead = false;

  const read = (body: unknown, headers = editor, maxStateLength?: number) =>
    readUnsavedRichText({ headers, maxStateLength, payload, request: body });

  const readAtDepth = (depth: number, body: unknown, headers = editor) =>
    readUnsavedRichText({ depth, headers, payload, request: body });

  const bodyOf = (docId: string, state: unknown = article()): LiveRichTextRequest => ({
    field: { ...page(docId), key: "body" },
    locale: "en",
    state,
  });

  beforeAll(async () => {
    payload = await startRealPayload({
      canRead: everyoneButTheOutsider,
      canReadGuardedBody: editorsOnly,
      canReadMedia: everyoneButTheWriter,
      name: "unsaved-rich-text",
      onPageReadBeforeThePlugin: (readPage) => {
        if (throwsOnRead) throw new Error("The hook cannot read this body");
        if (replacesBodyOnRead) readPage.body = richText("Replaced by a hook");
      },
      plugin: { instantPreview: true },
    });
    pages = await seedPages(payload);
    const photo = await payload.create({
      collection: "media",
      data: { alt: "A harbour" },
      file: { data: Buffer.from("photo"), mimetype: "text/plain", name: "photo.txt", size: 5 },
    });
    photoId = Number(photo.id);
    editor = await signIn(payload, EDITOR);
    outsider = await signIn(payload, OUTSIDER);
    writer = await signIn(payload, WRITER);
  }, START_TIMEOUT_MS);

  afterAll(() => payload.destroy());

  it("marks the text nodes of the unsaved state with the shape of that state", async () => {
    const shape = shapeOf(article(), fieldAddressOf(page(pages.landing), "body"));

    const content = await read(bodyOf(pages.landing));

    expect(nodeMarkersOf(content)).toEqual(
      ARTICLE_TEXT_NODES.map(({ address, text }) => ({
        address,
        markers: [{ node: address, shape }],
        text,
      }))
    );
  });

  it("addresses the field like the draft read of the saved document", async () => {
    const saved = await readMarked(payload, pages.landing);

    const content = await read(bodyOf(pages.landing));

    expect(metaOf(content)).toEqual(metaAt(saved, "body"));
  });

  it("reads a field in an array row by the id of the row", async () => {
    const saved = await readMarked(payload, pages.landing);
    const rowId = valueAt(saved, "list.1.id") as string;

    const content = await read({
      field: { ...page(pages.landing), key: `list.${rowId}.note` },
      state: article(),
    });

    expect(metaOf(content)).toEqual(metaAt(saved, "list.1.note"));
    expect(topLevelTypesOf(content)).toEqual(["paragraph", "paragraph", "list"]);
  });

  it("reads a field in a block by the id of the block", async () => {
    const saved = await readMarked(payload, pages.landing);
    const blockId = valueAt(saved, "layout.1.id") as string;

    const content = await read({
      field: { ...page(pages.landing), key: `layout.${blockId}.body` },
      state: article(),
    });

    expect(metaOf(content)).toEqual(metaAt(saved, "layout.1.body"));
    expect(topLevelTypesOf(content)).toEqual(["paragraph", "paragraph", "list"]);
  });

  it("reads a localized field in the locale of the request", async () => {
    const content = await read({
      field: { ...page(pages.landing), key: "localizedBody" },
      locale: "de",
      state: article(),
    });

    expect(topLevelTypesOf(content)).toEqual(["paragraph", "paragraph", "list"]);
  });

  it("reads a field in a row of a localized array by the id of the row in the locale of the request", async () => {
    const { localizedList } = await payload.update({
      collection: "pages",
      context: { visualEditing: false },
      data: { localizedList: [{ label: "Zeile", note: richText("Notiz") }] },
      draft: true,
      id: pages.landing,
      locale: "de",
    });
    const field = { ...page(pages.landing), key: `localizedList.${localizedList?.[0]?.id}.note` };

    expect(topLevelTypesOf(await read({ field, locale: "de", state: article() }))).toEqual([
      "paragraph",
      "paragraph",
      "list",
    ]);
    expect(await read({ field, locale: "en", state: article() })).toBeNull();
  });

  it("reads a field of a global", async () => {
    const saved = await payload.findGlobal({
      context: { visualEditing: true },
      draft: true,
      slug: "settings",
    });

    const content = await read({ field: { ...SETTINGS, key: "footnote" }, state: richText("New") });

    expect(metaOf(content)).toEqual(metaAt(saved, "footnote"));
    expect(topLevelTypesOf(content)).toEqual(["paragraph"]);
  });

  it("populates an upload the saved document does not have", async () => {
    const content = await readAtDepth(1, bodyOf(pages.landing, withNode(uploadNode(photoId))));

    expect(valueAt(content, "root.children.3.value")).toMatchObject({
      filename: "photo.txt",
      id: photoId,
    });
  });

  describe("reads a related document posted as an object by its id alone", () => {
    const relatedIn = async (node: object, path: string) =>
      valueAt(
        await readAtDepth(1, bodyOf(pages.landing, withNode(node))),
        `root.children.3.${path}`
      );

    it.each([
      ["an upload", (value: unknown) => ({ ...uploadNode(photoId), value }), "value"],
      [
        "a relationship",
        (value: unknown) => ({
          format: "",
          relationTo: "media",
          type: "relationship",
          value,
          version: 2,
        }),
        "value",
      ],
      [
        "an internal link",
        (value: unknown) => ({
          children: [{ text: "Photo", type: "text", version: 1 }],
          fields: { doc: { relationTo: "media", value }, linkType: "internal" },
          format: "",
          type: "link",
          version: 3,
        }),
        "fields.doc.value",
      ],
    ])("in %s", async (_name, nodeOf, path) => {
      const related = await relatedIn(nodeOf({ id: photoId, injected: true }), path);

      expect(related).toEqual(await relatedIn(nodeOf(photoId), path));
      expect(related).not.toHaveProperty("injected");
    });
  });

  it("leaves the stored document as it was", async () => {
    const before = await readStored(payload, pages.landing);

    await read(bodyOf(pages.landing));

    expect(await readStored(payload, pages.landing)).toEqual(before);
  });

  describe("gives nothing", () => {
    it("to a request without a signed-in user", async () => {
      expect(await read(bodyOf(pages.landing), NO_HEADERS)).toBeNull();
    });

    it("to a user who may not read the document", async () => {
      expect(await read(bodyOf(pages.landing), outsider)).toBeNull();
    });

    it("to a user who may read the document but not the field", async () => {
      const request = { field: { ...page(pages.landing), key: "guardedBody" }, state: article() };

      expect(await read(request, writer)).toBeNull();
      expect(await read(request, editor)).not.toBeNull();
    });

    it("to a user who may not read the global", async () => {
      const request = { field: { ...SETTINGS, key: "footnote" }, state: richText("New") };

      expect(await read(request, outsider)).toBeNull();
    });

    it("for a document that does not exist", async () => {
      expect(await read(bodyOf("999999"))).toBeNull();
    });

    it("for a collection that does not exist", async () => {
      const field = { collectionSlug: "nowhere", docId: "1", key: "body", kind: "collection" };

      expect(await read({ field, state: article() })).toBeNull();
    });

    it("for a collection the plugin skips", async () => {
      const field = { collectionSlug: "documents", docId: "1", key: "alt", kind: "collection" };

      expect(await read({ field, state: article() })).toBeNull();
    });

    it("for a field that is not rich text", async () => {
      const field = { ...page(pages.landing), key: "label" };

      expect(await read({ field, state: article() })).toBeNull();
    });

    it("for a row the saved document does not have", async () => {
      const field = { ...page(pages.landing), key: "list.no-such-row.note" };

      expect(await read({ field, state: article() })).toBeNull();
    });

    it("for the key of a text node", async () => {
      const field = { ...page(pages.landing), key: "body#shape#0.0" };

      expect(await read({ field, state: article() })).toBeNull();
    });

    it("for a locale the project does not have", async () => {
      expect(await read({ ...bodyOf(pages.landing), locale: "fr" })).toBeNull();
    });

    it("for a state that is longer than the limit", async () => {
      const length = JSON.stringify(article()).length;

      expect(await read(bodyOf(pages.landing), editor, length - 1)).toBeNull();
      expect(await read(bodyOf(pages.landing), editor, length)).not.toBeNull();
    });

    it.each([
      ["no editor state", "Hello"],
      ["a state without a root node", { root: { children: [], type: "paragraph" } }],
      ["a node without a type", { root: { children: [{ children: [] }], type: "root" } }],
      ["children that are not nodes", { root: { children: ["Hello"], type: "root" } }],
    ])("for %s", async (_name, state) => {
      expect(await read(bodyOf(pages.landing, state))).toBeNull();
    });

    it.each([200, 4000, 40_000])("for a state of %i nested nodes", async (levels) => {
      const state = richText("Deep");
      let innermost = state.root.children[0] as { children: object[] };
      for (let level = 0; level < levels; level += 1) {
        const child = { children: [], type: "paragraph" };
        innermost.children = [child];
        innermost = child;
      }

      expect(await read(bodyOf(pages.landing, state))).toBeNull();
    });

    it("for a state whose node holds data nested 4000 levels deep", async () => {
      const deepest: unknown[] = [];
      let fields = deepest;
      for (let level = 0; level < 4000; level += 1) fields = [fields];
      const state = { root: { ...article().root, fields } };

      expect(await read(bodyOf(pages.landing, state))).toBeNull();
    });

    it("for a state that refers to itself", async () => {
      const state: Record<string, unknown> = article();
      state.self = state;

      expect(await read(bodyOf(pages.landing, state))).toBeNull();
    });

    it.each([
      ["no arguments", []],
      ["a string", "field=body"],
      ["nothing", undefined],
      ["null", null],
      ["no field", { state: article() }],
      ["no state", { field: { key: "body" } }],
      ["an empty object", {}],
    ])("for a request that is %s", async (_name, request) => {
      expect(await read(request)).toBeNull();
    });

    it("and signs nobody in for an argument that is not a request", async () => {
      const signIns = vi.spyOn(payload, "auth");

      expect(await read({ field: { key: "body" } })).toBeNull();
      expect(signIns).not.toHaveBeenCalled();
      signIns.mockRestore();
    });

    it("when the document is not read within the time limit", async () => {
      readDelayMs = SLOW_READ_MS;

      const content = await readUnsavedRichText({
        headers: editor,
        payload,
        request: bodyOf(pages.landing),
        timeLimitMs: SHORT_TIME_LIMIT_MS,
      });
      readDelayMs = 0;
      await waitFor(SLOW_READ_MS);

      expect(content).toBeNull();
      expect(await read(bodyOf(pages.landing))).not.toBeNull();
    });

    it("when a read hook of the project throws, and logs the error", async () => {
      const logged = vi.spyOn(payload.logger, "error").mockImplementation(() => undefined);
      throwsOnRead = true;

      const content = await read(bodyOf(pages.landing));
      throwsOnRead = false;

      expect(content).toBeNull();
      expect(logged).toHaveBeenCalledOnce();
      logged.mockRestore();
    });

    it.each(["abc", "", "1.5", "Infinity", "1e0", "1 OR 1=1", "007"])(
      "for the document id %j of a collection with numeric ids",
      async (docId) => {
        const field = { collectionSlug: "pages", docId, key: "body", kind: "collection" };

        expect(await read({ field, locale: "en", state: article() })).toBeNull();
      }
    );

    it("for a global addressed with a document id", async () => {
      const field = { ...SETTINGS, docId: "7", key: "footnote" };

      expect(await read({ field, state: article() })).toBeNull();
    });

    it("for a collection addressed as a global", async () => {
      const field = { collectionSlug: "pages", key: "body", kind: "global" };

      expect(await read({ field, state: article() })).toBeNull();
    });

    it("for a rich text field of an auth collection", async () => {
      const [user] = (await payload.find({ collection: "users", limit: 1 })).docs;
      const field = {
        collectionSlug: "users",
        docId: String(user?.id),
        key: "bio",
        kind: "collection",
      };

      expect(await read({ field, state: article() })).toBeNull();
    });

    it.each(["lockedBody", "hiddenBody"])(
      "for the rich text field %s, which the editor cannot change",
      async (key) => {
        const field = { ...page(pages.landing), key };

        expect(await read({ field, state: article() })).toBeNull();
      }
    );

    it("when the value that was read does not have the structure of the posted state", async () => {
      replacesBodyOnRead = true;

      const content = await read(bodyOf(pages.landing));
      replacesBodyOnRead = false;

      expect(content).toBeNull();
    });
  });

  it("does not populate an upload the user may not read", async () => {
    const content = await readAtDepth(
      1,
      bodyOf(pages.landing, withNode(uploadNode(photoId))),
      writer
    );

    expect(topLevelTypesOf(content)).toEqual(["paragraph", "paragraph", "list", "upload"]);
    expect(valueAt(content, "root.children.3.value")).toBeNull();
  });

  describe("posted as the body of a request", () => {
    const readBody = (body: string, maxStateLength?: number) =>
      readUnsavedRichText({ maxStateLength, payload, request: postOf(body, editor) });

    it("reads the request and the user from it", async () => {
      const content = await readBody(JSON.stringify(bodyOf(pages.landing)));

      expect(topLevelTypesOf(content)).toEqual(["paragraph", "paragraph", "list"]);
    });

    it.each([
      ["no arguments", "[]"],
      ["no JSON", "field=body"],
      ["nothing", ""],
      ["null", "null"],
      ["4000 nested nodes", `{"state":{"root":${"[".repeat(4000)}${"]".repeat(4000)}}}`],
    ])("gives nothing for a body that holds %s", async (_name, body) => {
      expect(await readBody(body)).toBeNull();
    });

    it("gives nothing for a body longer than any accepted state", async () => {
      const body = JSON.stringify({ ...bodyOf(pages.landing), padding: "x".repeat(10_000) });

      expect(await readBody(body, JSON.stringify(article()).length)).toBeNull();
    });

    it("gives nothing for a body that does not arrive within the time limit, and stops reading it", async () => {
      const watched = slowBodyOf(" ", SHORT_TIME_LIMIT_MS);
      const request = streamedPostOf(watched.body, editor);

      expect(await readUnsavedRichText({ payload, request, timeLimitMs: SLOW_READ_MS })).toBeNull();
      expect(watched.cancelled).toBe(true);
    });

    it("reads no body without a signed-in user", async () => {
      const watched = slowBodyOf(JSON.stringify(bodyOf(pages.landing)), 0);

      expect(
        await readUnsavedRichText({ payload, request: streamedPostOf(watched.body, NO_HEADERS) })
      ).toBeNull();
      expect(watched.reads).toBe(0);
    });
  });

  describe("an upload or a link in the rich text", () => {
    const INJECTED = "Injected by the page";
    let authorId: number;
    let storyOf: (...nodes: object[]) => LiveRichTextRequest;

    const savedUpload = () => ({
      ...uploadNode(photoId),
      fields: { credit: authorId },
      id: "upload-saved",
    });
    const savedLink = () => ({
      children: [{ text: "Credits", type: "text", version: 1 }],
      fields: { credit: authorId, linkType: "custom", newTab: false, url: "https://saved.example" },
      format: "",
      id: "link-saved",
      type: "link",
      version: 3,
    });
    const injectedCredit = () => ({ id: authorId, name: INJECTED });
    const nodeAt = (content: unknown, position: number) =>
      valueAt(content, `root.children.${position}`) as EditorNode;

    beforeAll(async () => {
      const author = await payload.create({
        collection: "authors",
        data: { name: "Saved author" },
      });
      authorId = Number(author.id);
      const story = richText("Saved");
      story.root.children.push(savedUpload() as never, savedLink() as never);
      await payload.update({
        collection: "pages",
        data: { story },
        draft: true,
        id: pages.landing,
      });
      storyOf = (...nodes) => {
        const state = richText("Rewritten");
        state.root.children.push(...(nodes as never[]));
        return { field: { ...page(pages.landing), key: "story" }, locale: "en", state };
      };
    });

    it.each([0, 1])(
      "takes the fields of a saved upload from the saved document, at depth %i",
      async (depth) => {
        const posted = { ...savedUpload(), fields: { credit: injectedCredit() } };

        const content = await readAtDepth(depth, storyOf(posted));

        expect(JSON.stringify(content)).not.toContain(INJECTED);
        expect(nodeAt(content, 1).fields).toEqual(
          nodeAt(await readAtDepth(depth, storyOf(savedUpload())), 1).fields
        );
      }
    );

    it("keeps no fields of an upload the saved document does not have", async () => {
      const posted = { ...savedUpload(), fields: { credit: injectedCredit() }, id: "upload-new" };

      const content = await readAtDepth(0, storyOf(posted));

      expect(JSON.stringify(content)).not.toContain(INJECTED);
    });

    it("takes the own fields of a saved link from the saved document and its target from the request", async () => {
      const posted = {
        ...savedLink(),
        fields: { ...savedLink().fields, credit: injectedCredit(), url: "https://posted.example" },
      };

      const content = await readAtDepth(0, storyOf(posted));

      expect(nodeAt(content, 1).fields).toMatchObject({
        credit: authorId,
        url: "https://posted.example",
      });
    });

    it("keeps only the target of a link the saved document does not have", async () => {
      const posted = {
        ...savedLink(),
        fields: { ...savedLink().fields, credit: injectedCredit() },
        id: "link-new",
      };

      const content = await readAtDepth(0, storyOf(posted));

      expect(JSON.stringify(content)).not.toContain(INJECTED);
      expect(nodeAt(content, 1).fields).toMatchObject({ url: "https://saved.example" });
    });
  });

  describe("a block in the rich text", () => {
    const SAVED_CALLOUT = {
      blockType: "callout",
      id: "callout-saved",
      note: "Internal",
      text: "Saved",
    };
    let storyOf: (...nodes: object[]) => LiveRichTextRequest;

    const calloutOf = (content: unknown, position: number) =>
      (valueAt(content, `root.children.${position}`) as EditorNode).fields;

    beforeAll(async () => {
      const story = article();
      story.root.children.push(blockNode({ ...SAVED_CALLOUT, image: photoId }) as never);
      await payload.update({
        collection: "pages",
        data: { story },
        draft: true,
        id: pages.landing,
      });
      storyOf = (...nodes) => {
        const state = richText("Rewritten");
        state.root.children.push(...(nodes as never[]));
        return { field: { ...page(pages.landing), key: "story" }, locale: "en", state };
      };
    });

    it("gets the fields the saved document has for it, populated", async () => {
      const posted = blockNode({ blockType: "callout", id: SAVED_CALLOUT.id });

      const content = await readAtDepth(1, storyOf(posted));

      expect(calloutOf(content, 1)).toMatchObject({
        ...SAVED_CALLOUT,
        image: { filename: "photo.txt", id: photoId },
      });
    });

    it("ignores the fields posted for a saved block", async () => {
      const posted = blockNode({ ...SAVED_CALLOUT, note: "Posted note", text: "Posted" });

      const content = await read(storyOf(posted));

      expect(calloutOf(content, 1)).toMatchObject({ note: "Internal", text: "Saved" });
    });

    it("keeps only the identity of a block the saved document does not have", async () => {
      const posted = blockNode({ blockType: "callout", id: "callout-new", text: "Posted" });

      const content = await read(storyOf(posted));

      expect(calloutOf(content, 1)).toMatchObject({ blockType: "callout", id: "callout-new" });
      expect(calloutOf(content, 1)).not.toHaveProperty("text", "Posted");
    });

    it("leaves out a field of the block the user may not read", async () => {
      const posted = blockNode({ blockType: "callout", id: SAVED_CALLOUT.id });

      const content = await read(storyOf(posted), writer);

      expect(calloutOf(content, 1)).toMatchObject({ text: "Saved" });
      expect(calloutOf(content, 1)).not.toHaveProperty("note");
    });
  });

  describe("when read access reads the page itself", () => {
    beforeEach(() => {
      accessReadsThePage = true;
    });

    afterEach(() => {
      accessReadsThePage = false;
    });

    it("returns the unsaved state, not the saved value the access check read", async () => {
      const content = await read(bodyOf(pages.landing));

      expect(topLevelTypesOf(content)).toEqual(["paragraph", "paragraph", "list"]);
    });

    it("gives nothing when the access function reads the document with the access of the user", async () => {
      const before = await readStored(payload, pages.landing);
      readsWithTheAccessOfTheUser = true;

      const content = await read(bodyOf(pages.landing));
      readsWithTheAccessOfTheUser = false;

      expect(content).toBeNull();
      expect(await readStored(payload, pages.landing)).toEqual(before);
    });

    it("lets the hooks and access functions of the project tell that read from any other", async () => {
      readsOfUnsavedRichText.length = 0;

      await read(bodyOf(pages.landing));
      const duringTheUnsavedRead = [...readsOfUnsavedRichText];
      readsOfUnsavedRichText.length = 0;
      await payload.findByID({
        collection: "pages",
        depth: 0,
        disableErrors: true,
        id: Number(pages.landing),
        overrideAccess: false,
      });

      expect(duringTheUnsavedRead).toContain(true);
      expect(readsOfUnsavedRichText).toEqual([false]);
    });
  });
});
