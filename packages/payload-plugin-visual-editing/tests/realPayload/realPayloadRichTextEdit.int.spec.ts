import type { Access, FieldAccess, Payload, PayloadRequest } from "payload";

import { createLocalReq } from "payload";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { VE_FIELD_EDIT_PATH, VE_RICH_TEXT_VALUE_PATH } from "../../src/shared/protocol";
import { MAX_POSTED_EDITOR_STATE_LENGTH } from "../../src/shared/richText/postedEditorState";

import { START_TIMEOUT_MS, richText, startRealPayload } from "../support/realPayload";
import { article, page } from "../support/richTextPages";
import { EDITOR, OUTSIDER, WRITER, signIn } from "../support/unsavedRichTextRequests";

type Saved = { status: number; saved: unknown };

type Valued = { status: number; value: unknown; formats?: unknown; reason?: unknown };

type Node = Record<string, unknown> & { children?: Node[] };

type State = { root: Node & { children: Node[] } };

type Row = { id: string; [field: string]: unknown };

type Stored = Record<string, unknown>;

const withoutUpdatedAt = ({ updatedAt: _updatedAt, ...rest }: Stored): Stored => rest;

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

const inlineBlock = (fields: object): Node => ({ fields, type: "inlineBlock", version: 1 });

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
    const sent = new Headers(headers);
    sent.set("Content-Type", "application/json");
    const req = await createLocalReq(
      { req: { headers: sent } as Partial<PayloadRequest>, user: user ?? undefined },
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
    const { formats, reason, value } = (await response.json()) as Valued;
    return formats === null
      ? { reason, status: response.status, value }
      : { formats, status: response.status, value };
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

  const storedStory = async (docId: string): Promise<State> =>
    structuredClone((await read(docId)).story) as State;

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
      expect(answer.formats).toEqual({
        hasLinks: true,
        hasQuotes: true,
        headings: ["h1", "h2", "h3", "h4", "h5", "h6"],
        lists: ["bullet", "number", "check"],
        textFormats: 127,
      });
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

      expect(answer).toMatchObject({ status: 200, value: richText("Note") });
    });

    it.each([
      ["a row of a list", { list: [{ label: "Row", note: richText("Note") }] }, "list.new.note"],
      ["the first row of a list", {}, "list.new.note"],
      ["a block", {}, "layout.new.body"],
    ])(
      "is nothing yet, and no refusal, for %s the draft does not hold yet",
      async (_name, data, key) => {
        const docId = await create({ label: "Label", ...data });

        const answer = await valueOf({ ...page(docId), key });

        expect(answer).toEqual({ reason: undefined, status: 200, value: null });
      }
    );

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

        expect(answer).toEqual({ reason: "signed-out", status: 401, value: null });
      });

      it("for a user who cannot read the document", async () => {
        const answer = await valueOf({ ...page(docId), key: "body" }, outsider);

        expect(answer).toEqual({ reason: "not-editable", status: 422, value: null });
      });

      it("for a request that names no locale, in a project with locales", async () => {
        const answer = await valueOf({ ...page(docId), key: "body", locale: undefined });

        expect(answer).toEqual({ reason: "failed", status: 400, value: null });
      });

      it("for a global without drafts", async () => {
        const answer = await valueOf({
          collectionSlug: "settings",
          key: "footnote",
          kind: "global",
        });

        expect(answer).toEqual({ reason: "no-drafts", status: 409, value: null });
      });

      it("for a field the user may not read", async () => {
        const answer = await valueOf({ ...page(docId), key: "guardedBody" }, writer);

        expect(answer).toEqual({ reason: "not-editable", status: 422, value: null });
      });

      it.each([
        ["a hidden field", "hiddenBody"],
        ["a read-only field", "lockedBody"],
        ["a field that is not rich text", "label"],
        ["a field the schema does not have", "missing"],
        ["a rich text that holds nothing yet", "localizedBody"],
        ["a row inside a field that holds no rows", "label.new.note"],
      ])("for %s", async (_name, key) => {
        expect(await valueOf({ ...page(docId), key })).toEqual({
          reason: "not-editable",
          status: 422,
          value: null,
        });
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

    describe("that leaves out nodes the page cannot edit", () => {
      const FIRST = 0;
      const LINKED = 2;
      const RELATED = 5;
      const LAST = 6;

      const relationship = (): Node => ({
        format: "",
        relationTo: "authors",
        type: "relationship",
        value: authorId,
        version: 2,
      });

      const storyWithARelationship = (): State =>
        stateOf(...story().root.children, relationship(), element("paragraph", [text("End")]));

      it("removes the one that is missing and keeps the others as they are stored", async () => {
        const docId = await create({ story: storyWithARelationship() });
        const stored = await storedStory(docId);
        const [first, , linked, block, rule, related, last] = stored.root.children;

        const answer = await edit({
          ...page(docId),
          key: "story",
          state: stateOf(first!, linked!, block!, rule!, related!, last!),
        });

        const edited = await storedStory(docId);
        expect(answer).toEqual({ saved: true, status: 200 });
        expect(edited.root.children.map(({ type }) => type)).toEqual([
          "paragraph",
          "paragraph",
          "block",
          "horizontalrule",
          "relationship",
          "paragraph",
        ]);
        expect(JSON.stringify(edited.root.children.slice(2, 5))).toBe(
          JSON.stringify([block, rule, related])
        );
      });

      it("keeps the fields of a block that stays when the page sends none of them", async () => {
        const docId = await create({ story: storyWithARelationship() });
        const { children } = (await storedStory(docId)).root;

        const answer = await edit({
          ...page(docId),
          key: "story",
          state: stateOf(
            children[FIRST]!,
            children[LINKED]!,
            callout({ blockType: "callout", id: SAVED_CALLOUT.id }),
            children[RELATED]!
          ),
        });

        const edited = await storedStory(docId);
        expect(answer.saved).toBe(true);
        expect(edited.root.children.map(({ type }) => type)).toEqual([
          "paragraph",
          "paragraph",
          "block",
          "relationship",
        ]);
        expect(edited.root.children[2]!.fields).toEqual({ ...SAVED_CALLOUT, image: photoId });
      });

      it("removes every one of them", async () => {
        const docId = await create({ story: storyWithARelationship() });
        const { children } = (await storedStory(docId)).root;
        const edited = [children[FIRST]!, children[LINKED]!, children[LAST]!];

        const answer = await edit({ ...page(docId), key: "story", state: stateOf(...edited) });

        expect(answer).toEqual({ saved: true, status: 200 });
        expect((await storedStory(docId)).root.children).toEqual(edited);
      });

      it.each<[string, (related: Node) => Node]>([
        ["names another collection", (related) => ({ ...related, relationTo: "pages" })],
        ["names another document", (related) => ({ ...related, value: 999 })],
      ])("saves nothing when a relationship that stays %s", async (_name, change) => {
        const docId = await create({ story: storyWithARelationship() });
        const before = await storedStory(docId);
        const { children } = before.root;

        const answer = await edit({
          ...page(docId),
          key: "story",
          state: stateOf(
            children[FIRST]!,
            children[LINKED]!,
            change(children[RELATED]!),
            children[LAST]!
          ),
        });

        expect(answer).toEqual({ saved: false, status: 422 });
        expect(await storedStory(docId)).toEqual(before);
      });
    });

    it("writes the draft and leaves the published document as it is", async () => {
      const docId = await create({ body: richText("Published") });

      await edit({ ...page(docId), key: "body", state: richText("Draft") });

      expect((await read(docId, true)).body).toEqual(richText("Draft"));
      expect((await read(docId, false)).body).toEqual(richText("Published"));
    });

    describe("that names the state it began from", () => {
      const answerOf = async (body: unknown, headers = editor) => {
        const response = await post(VE_FIELD_EDIT_PATH, body, headers);
        const answered = (await response.json()) as { value?: unknown };
        return { ...answered, status: response.status };
      };

      it("is refused when the admin changed the field after the page was given its state, and the change of the admin stays", async () => {
        const docId = await create({ body: richText("Shown") });
        const shown = (await valueOf({ ...page(docId), key: "body" })).value;
        await payload.update({
          collection: "pages",
          data: { body: richText("Admin") },
          draft: true,
          id: docId,
        });

        const answer = await answerOf({
          ...page(docId),
          base: shown,
          key: "body",
          state: richText("Shown and typed"),
        });

        expect(answer).toMatchObject({ reason: "changed", saved: false, status: 412 });
        expect((await read(docId)).body).toEqual(richText("Admin"));
      });

      it("is saved when the draft holds the state it began from, and answers the state it saved", async () => {
        const docId = await create({ story: story() });
        const shown = (await valueOf({ ...page(docId), key: "story" }, writer)).value as State;
        const state = structuredClone(shown);
        state.root.children[0] = element("paragraph", [text("Rewritten")]);

        const answer = await answerOf({ ...page(docId), base: shown, key: "story", state }, writer);
        const next = await answerOf(
          { ...page(docId), base: answer.value, key: "story", state },
          writer
        );

        expect(answer).toMatchObject({ saved: true, status: 200 });
        expect(next).toMatchObject({ saved: true, status: 200 });
        const answered = answer.value as State;
        expect(answered.root.children[0]!.children).toMatchObject([{ text: "Rewritten" }]);
        expect(answered.root.children[3]!.fields).not.toHaveProperty("note");
      });
    });

    it("takes the fields of a block from the draft when the page sends none", async () => {
      const docId = await create({ story: story() });
      const state = await storedStory(docId);
      state.root.children[3] = callout({ blockType: "callout", id: SAVED_CALLOUT.id });

      const answer = await edit({ ...page(docId), key: "story", state });

      expect(answer.saved).toBe(true);
      expect((await storedStory(docId)).root.children[3]!.fields).toEqual({
        ...SAVED_CALLOUT,
        image: photoId,
      });
    });

    it("takes the fields of a block from the draft when the page sends others", async () => {
      const docId = await create({ story: story() });
      const state = await storedStory(docId);
      state.root.children[3] = callout({ ...SAVED_CALLOUT, note: "Forged", text: "Forged" });

      const answer = await edit({ ...page(docId), key: "story", state }, writer);

      expect(answer.saved).toBe(true);
      expect((await storedStory(docId)).root.children[3]!.fields).toEqual({
        ...SAVED_CALLOUT,
        image: photoId,
      });
    });

    it("keeps the fields of a block the user may not read when that user saves what they were shown", async () => {
      const docId = await create({ story: story() });
      const shown = (await valueOf({ ...page(docId), key: "story" }, writer)).value as State;
      shown.root.children[0] = element("paragraph", [text("Rewritten")]);

      const answer = await edit({ ...page(docId), key: "story", state: shown }, writer);

      const edited = await storedStory(docId);
      expect(answer.saved).toBe(true);
      expect(edited.root.children[0]!.children).toMatchObject([{ text: "Rewritten" }]);
      expect(edited.root.children[3]!.fields).toMatchObject({ note: "Internal" });
    });

    it("takes the fields of a link the page cannot change from the draft and its address from the page", async () => {
      const docId = await create({ story: story() });
      const state = await storedStory(docId);
      state.root.children[2] = element("paragraph", [
        link("https://moved.example", "link-saved", { credit: authorId + 1 }),
      ]);

      await edit({ ...page(docId), key: "story", state });

      const paragraph = (await storedStory(docId)).root.children[2];
      expect(paragraph!.children![0]!.fields).toEqual({
        credit: authorId,
        linkType: "custom",
        newTab: false,
        url: "https://moved.example",
      });
    });

    it("keeps a node the page cannot edit inside a list item and inside a link", async () => {
      const nested = (label: string) =>
        stateOf(
          element("list", [element("listitem", [text(label), horizontalRule()], { value: 1 })], {
            listType: "bullet",
            start: 1,
            tag: "ul",
          }),
          element("paragraph", [link("https://saved.example", "link-saved")])
        );
      const docId = await create({ story: nested("One") });

      const answer = await edit({ ...page(docId), key: "story", state: nested("Changed") });

      expect(answer.saved).toBe(true);
      expect((await storedStory(docId)).root.children[0]!.children![0]!.children).toMatchObject([
        { text: "Changed" },
        { type: "horizontalrule" },
      ]);
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

    it("writes the rich text of one block row and leaves every other row and field as it was", async () => {
      const created = await payload.create({
        collection: "pages",
        data: {
          label: "Kept",
          layout: [
            { blockType: "hero", body: article(), heading: "First" },
            { blockType: "hero", body: richText("Second body"), heading: "Second" },
            { blockType: "hero", body: article(), heading: "Third" },
          ],
        },
        draft: true,
      });
      const docId = String(created.id);
      const before = await read(docId);
      const [, second] = before.layout as Row[];
      const expected = structuredClone(before);
      (expected.layout as Row[])[1]!.body = richText("Changed");

      const answer = await edit({
        ...page(docId),
        key: `layout.${second!.id}.body`,
        state: richText("Changed"),
      });

      expect(answer).toEqual({ saved: true, status: 200 });
      expect(withoutUpdatedAt(await read(docId))).toEqual(withoutUpdatedAt(expected));
    });

    it("leaves every field of the other locale and every other field of the edited locale as it was", async () => {
      const created = await payload.create({
        collection: "pages",
        data: { localizedBody: richText("English"), story: story(), title: "English" },
        draft: true,
        locale: "en",
      });
      const docId = String(created.id);
      await payload.update({
        collection: "pages",
        data: { localizedBody: richText("Deutsch"), title: "Deutsch" },
        draft: true,
        id: docId,
        locale: "de",
      });
      const english = await read(docId, true, "en");
      const german = await read(docId, true, "de");

      const answer = await edit({
        ...page(docId),
        key: "localizedBody",
        locale: "de",
        state: richText("Neu"),
      });

      expect(answer).toEqual({ saved: true, status: 200 });
      expect(withoutUpdatedAt(await read(docId, true, "en"))).toEqual(withoutUpdatedAt(english));
      expect(withoutUpdatedAt(await read(docId, true, "de"))).toEqual(
        withoutUpdatedAt({ ...german, localizedBody: richText("Neu") })
      );
    });

    it("counts an edit that sends the state the field holds as saved", async () => {
      const docId = await create({ body: richText("Same") });

      const answer = await edit({ ...page(docId), key: "body", state: richText("Same") });

      expect(answer).toEqual({ saved: true, status: 200 });
    });

    it("keeps a link address the draft already holds on that link, whatever its scheme", async () => {
      const kept = element("paragraph", [link("ftp://files.example", "link-kept")]);
      const docId = await create({ body: stateOf(kept) });

      const answer = await edit({
        ...page(docId),
        key: "body",
        state: stateOf(element("paragraph", [text("Before")]), kept),
      });

      expect(answer.saved).toBe(true);
    });

    it.each([
      ["on another link", "link-other", "link-kept"],
      ["on a second link of the same id", "link-kept", "link-kept"],
    ])("refuses such an address %s", async (_name, addedId, keptId) => {
      const stored = stateOf(element("paragraph", [link("ftp://files.example", "link-kept")]));
      const docId = await create({ body: stored });

      const answer = await edit({
        ...page(docId),
        key: "body",
        state: stateOf(
          element("paragraph", [
            link("ftp://files.example", keptId),
            link("ftp://files.example", addedId),
          ])
        ),
      });

      expect(answer).toEqual({ saved: false, status: 422 });
      expect((await read(docId)).body).toEqual(stored);
    });

    it("keeps a text style and a node state the draft already holds", async () => {
      const styled = (label: string) =>
        stateOf({
          ...element("paragraph", [{ ...text(label), $: { color: "red" }, style: "color: red" }]),
          textStyle: "color: red",
        });
      const docId = await create({ body: styled("Red") });

      const answer = await edit({ ...page(docId), key: "body", state: styled("Still red") });

      expect(answer.saved).toBe(true);
    });

    describe("of a field whose editor allows bold and one heading size", () => {
      const plain = (...children: Node[]) => ({ key: "plainStory", state: stateOf(...children) });

      it("is told which formats the field allows", async () => {
        const docId = await create({ plainStory: richText("Plain") });

        const answer = await valueOf({ ...page(docId), key: "plainStory" });

        expect(answer.formats).toEqual({
          hasLinks: false,
          hasQuotes: false,
          headings: ["h2"],
          lists: [],
          textFormats: BOLD,
        });
      });

      it("is told a format the field already holds too", async () => {
        const docId = await create({ plainStory: stateOf(element("quote", [text("Said", 2)])) });

        const answer = await valueOf({ ...page(docId), key: "plainStory" });

        expect(answer.formats).toMatchObject({ hasQuotes: true, textFormats: 3 });
      });

      it("saves what the field allows", async () => {
        const docId = await create({ plainStory: richText("Plain") });

        const answer = await edit({
          ...page(docId),
          ...plain(element("heading", [text("Bold", BOLD)], { tag: "h2" })),
        });

        expect(answer).toEqual({ saved: true, status: 200 });
      });

      it.each<[string, Node]>([
        ["a heading of another size", element("heading", [text("Big")], { tag: "h1" })],
        ["a quote", element("quote", [text("Said")])],
        [
          "a list",
          element("list", [element("listitem", [text("One")], { value: 1 })], {
            listType: "bullet",
            start: 1,
            tag: "ul",
          }),
        ],
        ["an italic text", element("paragraph", [text("Slanted", 2)])],
        ["a link", element("paragraph", [link("/about", "link-new")])],
        [
          "a paragraph format the field does not allow",
          { ...element("paragraph", []), textFormat: 2 },
        ],
      ])("refuses %s", async (_name, node) => {
        const docId = await create({ plainStory: richText("Plain") });

        const answer = await edit({ ...page(docId), ...plain(node) });

        expect(answer).toEqual({ saved: false, status: 422 });
        expect((await read(docId)).plainStory).toEqual(richText("Plain"));
      });
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

      it("and says that it could not read a state that arrives as a JSON string", async () => {
        const response = await post(
          VE_FIELD_EDIT_PATH,
          { ...page(docId), key: "body", state: JSON.stringify(richText("Changed")) },
          editor
        );

        expect(response.status).toBe(400);
        expect(await response.json()).toEqual({ reason: "unreadable", saved: false });
      });

      it("for a state longer than a posted state may be", async () => {
        const state = richText("a".repeat(MAX_POSTED_EDITOR_STATE_LENGTH));

        expect(await refused({ state })).toEqual({ saved: false, status: 400 });
      });

      const changedStory = async (change: (children: Node[]) => Node[]) => {
        const state = await storedStory(docId);
        return { key: "story", state: stateOf(...change(state.root.children)) };
      };

      it.each<[string, (children: Node[]) => Node[]]>([
        [
          "a block the draft does not hold",
          (children) => [...children, callout({ blockType: "callout", id: "callout-new" })],
        ],
        [
          "a block without an id",
          (children) => children.map((node) => (node.type === "block" ? callout({}) : node)),
        ],
        [
          "a node posted twice after another one was removed",
          ([first, , linked, block, rule]) => [first!, linked!, block!, rule!, rule!],
        ],
        [
          "a block that carries the id of a removed upload",
          ([first, , linked, block, rule]) => [
            first!,
            callout({ blockType: "callout", id: "upload-saved" }),
            linked!,
            block!,
            rule!,
          ],
        ],
        [
          "a block posted before a node that was stored before it, after another one was removed",
          ([first, upload, linked, block]) => [first!, block!, linked!, upload!],
        ],
        [
          "a block posted twice",
          (children) => [...children, children.find(({ type }) => type === "block") as Node],
        ],
        [
          "two nodes the page cannot edit in another order",
          ([first, upload, linked, block, rule]) => [first!, block!, linked!, upload!, rule!],
        ],
        [
          "an inline block that carries the id of a stored block",
          (children) =>
            children.map((node) =>
              node.type === "block"
                ? element("paragraph", [
                    inlineBlock({ blockType: "callout", id: SAVED_CALLOUT.id }),
                  ])
                : node
            ),
        ],
        [
          "a block of another type under the id of a stored block",
          (children) =>
            children.map((node) =>
              node.type === "block" ? callout({ blockType: "hero", id: SAVED_CALLOUT.id }) : node
            ),
        ],
        [
          "an upload that names another file",
          (children) =>
            children.map((node) => (node.type === "upload" ? { ...node, value: 999 } : node)),
        ],
        [
          "an upload that names another collection",
          (children) =>
            children.map((node) =>
              node.type === "upload" ? { ...node, relationTo: "documents" } : node
            ),
        ],
        [
          "an upload with other fields",
          (children) =>
            children.map((node) =>
              node.type === "upload" ? { ...node, fields: { credit: 999 } } : node
            ),
        ],
        [
          "a node the page cannot edit moved into a list item",
          ([first, upload, linked, block, rule]) => [
            first!,
            upload!,
            linked!,
            block!,
            element("list", [element("listitem", [rule!], { value: 1 })], {
              listType: "bullet",
              start: 1,
              tag: "ul",
            }),
          ],
        ],
        [
          "a node of a type no editor of the field knows",
          (children) => [...children, { type: "mystery", version: 1 }],
        ],
      ])("for %s", async (_name, change) => {
        expect(await refused(await changedStory(change))).toEqual({ saved: false, status: 422 });
      });

      const validParagraph = () => element("paragraph", [text("Changed")]);

      it.each<[string, Node[]]>([
        ["a key the node does not have", [{ ...validParagraph(), onclick: "alert(1)" }]],
        ["a node without its keys", [{ children: [], type: "paragraph", version: 1 }]],
        ["a text node under the root", [text("Loose")]],
        ["a list item outside a list", [element("listitem", [text("Loose")], { value: 1 })]],
        ["a paragraph inside a paragraph", [element("paragraph", [validParagraph()])]],
        [
          "a style the draft does not hold",
          [element("paragraph", [{ ...text("Red"), style: "color: red" }])],
        ],
        ["a text format that is no format", [element("paragraph", [text("Odd", 4096)])]],
        ["a text mode that is no mode", [element("paragraph", [{ ...text("Odd"), mode: "odd" }])]],
        ["a version that is no number", [{ ...validParagraph(), version: "1" }]],
        ["an indent out of range", [{ ...validParagraph(), indent: 100_000 }]],
        ["a direction that is no direction", [{ ...validParagraph(), direction: "up" }]],
        [
          "a heading of a size that does not exist",
          [element("heading", [text("Big")], { tag: "h7" })],
        ],
        [
          "a list whose tag is not the tag of its type",
          [
            element("list", [element("listitem", [text("One")], { value: 1 })], {
              listType: "bullet",
              start: 1,
              tag: "script",
            }),
          ],
        ],
        ["a key of the prototype", [{ ...validParagraph(), constructor: { prototype: {} } }]],
        [
          "a state of the node the draft does not hold",
          [{ ...validParagraph(), $: { color: "red" } }],
        ],
      ])("for %s", async (_name, children) => {
        expect(await refused({ state: stateOf(...children) })).toEqual({
          saved: false,
          status: 422,
        });
      });

      it("for a key beside the root", async () => {
        const state = { ...richText("Changed"), extra: true };

        expect(await refused({ state })).toEqual({ saved: false, status: 422 });
      });

      it("for a key named __proto__ anywhere in the state", async () => {
        const state = JSON.parse(
          '{"root":{"children":[],"direction":null,"format":"","indent":0,"type":"root","version":1,"__proto__":{"polluted":true}}}'
        ) as State;

        expect(await refused({ state })).toEqual({ saved: false, status: 422 });
      });

      it.each(FORBIDDEN_URLS)(
        "for a link the draft does not hold that leads to %s",
        async (url) => {
          const state = stateOf(element("paragraph", [link(url, "link-new")]));

          expect(await refused({ state })).toEqual({ saved: false, status: 422 });
        }
      );

      it.each<[string, object]>([
        ["an address that is a list", { linkType: "custom", url: [`${SCRIPT}:alert(1)`] }],
        ["an empty address on a custom link", { linkType: "custom", url: "" }],
        ["no address on a custom link", { linkType: "custom" }],
        ["a link type that does not exist", { linkType: "odd", url: "/about" }],
        ["a linked document that is no reference", { doc: { value: {} }, linkType: "internal" }],
        ["a flag that is no flag", { linkType: "custom", newTab: "yes", url: "/about" }],
      ])("for a link with %s", async (_name, fields) => {
        const posted = element("link", [text("Credits")], { fields, id: "link-new", version: 3 });

        expect(await refused({ state: stateOf(element("paragraph", [posted])) })).toEqual({
          saved: false,
          status: 422,
        });
      });

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
