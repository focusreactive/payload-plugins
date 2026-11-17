import type { Access, FieldAccess, Payload, PayloadRequest } from "payload";

import { createLocalReq } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { VE_FIELD_EDIT_PATH, VE_RICH_TEXT_VALUE_PATH } from "../../src/shared/protocol";
import { MAX_POSTED_EDITOR_STATE_LENGTH } from "../../src/shared/richText/postedEditorState";

import { START_TIMEOUT_MS, richText, startRealPayload } from "../support/realPayload";
import { article, page } from "../support/richTextPages";
import { EDITOR, OUTSIDER, WRITER, signIn } from "../support/unsavedRichTextRequests";

type Saved = { status: number; saved: unknown };

type Valued = { status: number; value: unknown };

type Node = Record<string, unknown> & { children?: Node[] };

type State = { root: Node & { children: Node[] } };

type Row = { id: string; [field: string]: unknown };

const BOLD = 1;

const SCRIPT = "javascript";

const FORBIDDEN_URLS = [
  `${SCRIPT}:alert(1)`,
  ` JAVA\tSCRIPT:alert(1)`,
  "data:text/html,x",
  "vbscript:x",
];

const everyoneButTheOutsider: Access = ({ req }) => req.user?.email !== OUTSIDER.email;
const editorsOnly: FieldAccess = ({ req }) => req.user?.email === EDITOR.email;

const text = (value: string, format = 0): Node => ({
  detail: 0,
  format,
  mode: "normal",
  style: "",
  text: value,
  type: "text",
  version: 1,
});

const element = (type: string, children: Node[], extra: object = {}): Node => ({
  children,
  direction: null,
  format: "",
  indent: 0,
  type,
  version: 1,
  ...extra,
});

const stateOf = (...children: Node[]): State => ({
  root: { ...element("root", children), children },
});

const link = (url: string, id: string, extra: object = {}): Node =>
  element("link", [text("Credits")], {
    fields: { linkType: "custom", newTab: false, url, ...extra },
    id,
    version: 3,
  });

const SAVED_CALLOUT = {
  blockType: "callout",
  id: "callout-saved",
  note: "Internal",
  text: "Saved",
};

const callout = (fields: object): Node => ({ fields, format: "", type: "block", version: 2 });

const horizontalRule = (): Node => ({ type: "horizontalrule", version: 1 });

describe("editing rich text through the endpoints", () => {
  let payload: Payload;
  let editor: Headers;
  let outsider: Headers;
  let writer: Headers;
  let photoId: number;
  let authorId: number;

  const post = async (path: string, body: unknown, headers: Headers): Promise<Response> => {
    const endpoint = payload.config.endpoints.find((candidate) => candidate.path === path);
    const { user } = await payload.auth({ headers });
    const req = await createLocalReq(
      { req: { headers } as Partial<PayloadRequest>, user: user ?? undefined },
      payload
    );
    req.text = async () => JSON.stringify({ locale: "en", ...(body as object) });
    return (await endpoint!.handler(req)) as Response;
  };

  const edit = async (body: unknown, headers = editor): Promise<Saved> => {
    const response = await post(VE_FIELD_EDIT_PATH, body, headers);
    const { saved } = (await response.json()) as { saved: unknown };
    return { saved, status: response.status };
  };

  const valueOf = async (body: unknown, headers = editor): Promise<Valued> => {
    const response = await post(VE_RICH_TEXT_VALUE_PATH, body, headers);
    const { value } = (await response.json()) as { value: unknown };
    return { status: response.status, value };
  };

  const create = async (data: Record<string, unknown>) => {
    const created = await payload.create({
      collection: "pages",
      data: { ...data, _status: "published" },
      locale: "en",
    });
    return String(created.id);
  };

  const read = (docId: string, draft = true, locale = "en") =>
    payload.findByID({
      collection: "pages",
      context: { visualEditing: false },
      depth: 0,
      draft,
      fallbackLocale: false,
      id: docId,
      locale,
      showHiddenFields: true,
    }) as Promise<Record<string, unknown>>;

  const savedUpload = (): Node => ({
    fields: { credit: authorId },
    format: "",
    id: "upload-saved",
    relationTo: "media",
    type: "upload",
    value: photoId,
    version: 3,
  });

  const story = (): State =>
    stateOf(
      element("paragraph", [text("Hello "), text("world")], { textFormat: 0 }),
      savedUpload(),
      element("paragraph", [link("https://saved.example", "link-saved", { credit: authorId })]),
      callout({ ...SAVED_CALLOUT, image: photoId }),
      horizontalRule()
    );

  beforeAll(async () => {
    payload = await startRealPayload({
      canRead: everyoneButTheOutsider,
      canReadGuardedBody: editorsOnly,
      name: "rich-text-edit",
      plugin: { inlineEditing: true, instantPreview: true },
    });
    editor = await signIn(payload, EDITOR);
    outsider = await signIn(payload, OUTSIDER);
    writer = await signIn(payload, WRITER);
    const photo = await payload.create({
      collection: "media",
      data: { alt: "A harbour" },
      file: { data: Buffer.from("photo"), mimetype: "text/plain", name: "photo.txt", size: 5 },
    });
    const author = await payload.create({ collection: "authors", data: { name: "Ada" } });
    photoId = Number(photo.id);
    authorId = Number(author.id);
  }, START_TIMEOUT_MS);

  afterAll(async () => {
    await payload.destroy();
  });

  describe("the value of a rich text field", () => {
    it("is the state the draft stores, without markers and without populated documents", async () => {
      const docId = await create({ story: story() });

      const answer = await valueOf({ ...page(docId), key: "story" });

      expect(answer.status).toBe(200);
      expect(answer.value).toEqual((await read(docId)).story);
      expect((answer.value as State).root.children[1]).toMatchObject({ value: photoId });
    });

    it("is the draft, not the published document", async () => {
      const docId = await create({ body: richText("Published") });
      await payload.update({
        collection: "pages",
        data: { body: richText("Draft") },
        draft: true,
        id: docId,
      });

      const answer = await valueOf({ ...page(docId), key: "body" });

      expect(answer.value).toEqual(richText("Draft"));
    });

    it("is the state of one row of a list", async () => {
      const docId = await create({ list: [{ label: "Row", note: richText("Note") }] });
      const [row] = (await read(docId)).list as Row[];

      const answer = await valueOf({ ...page(docId), key: `list.${row!.id}.note` });

      expect(answer).toEqual({ status: 200, value: richText("Note") });
    });

    it("leaves out the fields of a block the user may not read", async () => {
      const docId = await create({ story: story() });

      const answer = await valueOf({ ...page(docId), key: "story" }, writer);

      const block = (answer.value as State).root.children[3]!;
      expect(block.fields).toMatchObject({ text: "Saved" });
      expect(block.fields).not.toHaveProperty("note");
    });

    describe("is not answered", () => {
      let docId: string;

      beforeAll(async () => {
        docId = await create({
          body: richText("Body"),
          guardedBody: richText("Guarded"),
          hiddenBody: richText("Hidden"),
          label: "Label",
          lockedBody: richText("Locked"),
        });
      });

      it("for a request without a user", async () => {
        const answer = await valueOf({ ...page(docId), key: "body" }, new Headers());

        expect(answer).toEqual({ status: 401, value: null });
      });

      it("for a user who cannot read the document", async () => {
        const answer = await valueOf({ ...page(docId), key: "body" }, outsider);

        expect(answer).toEqual({ status: 422, value: null });
      });

      it("for a request that names no locale, in a project with locales", async () => {
        const answer = await valueOf({ ...page(docId), key: "body", locale: undefined });

        expect(answer).toEqual({ status: 400, value: null });
      });

      it("for a global without drafts", async () => {
        const answer = await valueOf({
          collectionSlug: "settings",
          key: "footnote",
          kind: "global",
        });

        expect(answer).toEqual({ status: 409, value: null });
      });

      it("for a field the user may not read", async () => {
        const answer = await valueOf({ ...page(docId), key: "guardedBody" }, writer);

        expect(answer).toEqual({ status: 422, value: null });
      });

      it.each([
        ["a hidden field", "hiddenBody"],
        ["a read-only field", "lockedBody"],
        ["a field that is not rich text", "label"],
        ["a field the schema does not have", "missing"],
        ["a rich text that holds nothing yet", "localizedBody"],
      ])("for %s", async (_name, key) => {
        expect(await valueOf({ ...page(docId), key })).toEqual({ status: 422, value: null });
      });
    });
  });

  describe("an edit of a rich text field", () => {
    it("changes text and formats and leaves every other node as it was", async () => {
      const docId = await create({ story: story() });
      const stored = (await read(docId)).story as State;
      const [, upload, linked, block, rule] = stored.root.children;
      const state = stateOf(
        element("heading", [text("Hello "), text("there", BOLD)], { tag: "h2" }),
        upload!,
        linked!,
        block!,
        rule!
      );

      const answer = await edit({ ...page(docId), key: "story", state });

      const edited = (await read(docId)).story as State;
      expect(answer).toEqual({ saved: true, status: 200 });
      expect(edited.root.children[0]).toMatchObject({
        children: [{ text: "Hello " }, { format: BOLD, text: "there" }],
        tag: "h2",
        type: "heading",
      });
      expect(JSON.stringify(edited.root.children.slice(1))).toBe(
        JSON.stringify(stored.root.children.slice(1))
      );
    });

    it("writes the draft and leaves the published document as it is", async () => {
      const docId = await create({ body: richText("Published") });

      await edit({ ...page(docId), key: "body", state: richText("Draft") });

      expect((await read(docId, true)).body).toEqual(richText("Draft"));
      expect((await read(docId, false)).body).toEqual(richText("Published"));
    });

    it("takes the fields of a block from the draft when the page sends none", async () => {
      const docId = await create({ story: story() });
      const posted = callout({ blockType: "callout", id: SAVED_CALLOUT.id });

      const answer = await edit({
        ...page(docId),
        key: "story",
        state: stateOf(element("paragraph", [text("Rewritten")]), posted),
      });

      const edited = (await read(docId)).story as State;
      expect(answer.saved).toBe(true);
      expect(edited.root.children[1]!.fields).toEqual({ ...SAVED_CALLOUT, image: photoId });
    });

    it("takes the fields of a block from the draft when the page sends others", async () => {
      const docId = await create({ story: story() });
      const posted = callout({ ...SAVED_CALLOUT, note: "Forged", text: "Forged" });

      await edit({ ...page(docId), key: "story", state: stateOf(posted) }, writer);

      const edited = (await read(docId)).story as State;
      expect(edited.root.children[0]!.fields).toEqual({ ...SAVED_CALLOUT, image: photoId });
    });

    it("takes the fields of an upload and of a link from the draft", async () => {
      const docId = await create({ story: story() });
      const forgedUpload = { ...savedUpload(), fields: { credit: authorId + 1 } };
      const movedLink = link("https://moved.example", "link-saved", { credit: authorId + 1 });

      await edit({
        ...page(docId),
        key: "story",
        state: stateOf(forgedUpload, element("paragraph", [movedLink])),
      });

      const [upload, paragraph] = ((await read(docId)).story as State).root.children;
      expect(upload!.fields).toEqual({ credit: authorId });
      expect(paragraph!.children![0]!.fields).toEqual({
        credit: authorId,
        linkType: "custom",
        newTab: false,
        url: "https://moved.example",
      });
    });

    it("writes one row of a list and keeps the other rows", async () => {
      const docId = await create({
        list: [
          { label: "First", note: richText("First note") },
          { label: "Second", note: richText("Second note") },
        ],
      });
      const [, second] = (await read(docId)).list as Row[];

      await edit({ ...page(docId), key: `list.${second!.id}.note`, state: richText("Changed") });

      const rows = (await read(docId)).list as Row[];
      expect(rows.map(({ label, note }) => [label, note])).toEqual([
        ["First", richText("First note")],
        ["Second", richText("Changed")],
      ]);
    });

    it("writes a localized rich text into the locale of the page alone", async () => {
      const docId = await create({ localizedBody: richText("English") });

      const answer = await edit({
        ...page(docId),
        key: "localizedBody",
        locale: "de",
        state: richText("Deutsch"),
      });

      expect(answer).toEqual({ saved: true, status: 200 });
      expect((await read(docId, true, "de")).localizedBody).toEqual(richText("Deutsch"));
      expect((await read(docId, true, "en")).localizedBody).toEqual(richText("English"));
    });

    it("counts an edit that sends the state the field holds as saved", async () => {
      const docId = await create({ body: richText("Same") });

      const answer = await edit({ ...page(docId), key: "body", state: richText("Same") });

      expect(answer).toEqual({ saved: true, status: 200 });
    });

    it("keeps a link address the draft already holds, whatever its scheme", async () => {
      const kept = element("paragraph", [link("ftp://files.example", "link-kept")]);
      const docId = await create({ body: stateOf(kept) });

      const answer = await edit({
        ...page(docId),
        key: "body",
        state: stateOf(element("paragraph", [text("Before")]), kept),
      });

      expect(answer.saved).toBe(true);
    });

    describe("saves nothing", () => {
      let docId: string;

      beforeAll(async () => {
        docId = await create({
          body: article(),
          guardedBody: richText("Guarded"),
          hiddenBody: richText("Hidden"),
          internal: { label: "Internal" },
          label: "Label",
          lockedBody: richText("Locked"),
          story: story(),
        });
      });

      const refused = async (body: Record<string, unknown>, headers?: Headers) => {
        const before = await read(docId);
        const answer = await edit(
          { ...page(docId), key: "body", state: richText("Changed"), ...body },
          headers
        );
        expect(await read(docId)).toEqual(before);
        return answer;
      };

      it("for a request without a user", async () => {
        expect(await refused({}, new Headers())).toEqual({ saved: false, status: 401 });
      });

      it("for a user who cannot read the document", async () => {
        expect(await refused({}, outsider)).toEqual({ saved: false, status: 422 });
      });

      it("for a field the user may not read", async () => {
        expect(await refused({ key: "guardedBody" }, writer)).toEqual({
          saved: false,
          status: 422,
        });
      });

      it.each([
        ["a hidden field", "hiddenBody"],
        ["a read-only field", "lockedBody"],
        ["an excluded field", "internal.label"],
        ["a field that is not rich text", "label"],
        ["a field the schema does not have", "missing"],
        ["a text node of the rich text", "body#shape#0.0"],
      ])("for %s", async (_name, key) => {
        expect(await refused({ key })).toEqual({ saved: false, status: 422 });
      });

      it.each([
        ["a state without a root", { children: [] }],
        ["a root of another type", { root: { children: [], type: "paragraph" } }],
        ["a node without a type", { root: { children: [{ children: [] }], type: "root" } }],
        ["a state that is no object", "state"],
      ])("for %s", async (_name, state) => {
        expect(await refused({ state })).toEqual({ saved: false, status: 400 });
      });

      it("for a state longer than a posted state may be", async () => {
        const state = richText("a".repeat(MAX_POSTED_EDITOR_STATE_LENGTH));

        expect(await refused({ state })).toEqual({ saved: false, status: 400 });
      });

      it("for a block the draft does not hold", async () => {
        const invented = callout({ blockType: "callout", id: "callout-new", text: "Invented" });

        const answer = await refused({ key: "story", state: stateOf(invented) });

        expect(answer).toEqual({ saved: false, status: 422 });
      });

      it("for a block without an id", async () => {
        const answer = await refused({
          key: "story",
          state: stateOf(callout({ blockType: "callout", text: "Invented" })),
        });

        expect(answer).toEqual({ saved: false, status: 422 });
      });

      it.each(FORBIDDEN_URLS)(
        "for a link the draft does not hold that leads to %s",
        async (url) => {
          const state = stateOf(element("paragraph", [link(url, "link-new")]));

          expect(await refused({ state })).toEqual({ saved: false, status: 422 });
        }
      );

      it("for a locale the project does not have", async () => {
        expect(await refused({ locale: "fr" })).toEqual({ saved: false, status: 400 });
      });

      it("for a document another editor has open", async () => {
        const [other] = (
          await payload.find({ collection: "users", where: { email: { equals: OUTSIDER.email } } })
        ).docs;
        const lock = await payload.create({
          collection: "payload-locked-documents",
          data: {
            document: { relationTo: "pages", value: Number(docId) },
            user: { relationTo: "users", value: other!.id },
          },
        });

        const answer = await refused({});
        const locks = await payload.find({ collection: "payload-locked-documents" });
        await payload.delete({ collection: "payload-locked-documents", id: lock.id });

        expect(answer.saved).toBe(false);
        expect(locks.docs.map(({ id }) => id)).toEqual([lock.id]);
      });

      it("for a global without drafts", async () => {
        const answer = await edit({
          collectionSlug: "settings",
          key: "footnote",
          kind: "global",
          state: richText("Changed"),
        });

        expect(answer).toEqual({ saved: false, status: 409 });
      });
    });
  });
});
