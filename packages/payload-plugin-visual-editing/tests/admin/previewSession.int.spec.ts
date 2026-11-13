import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AdminState,
  PreviewMessage,
  PreviewSession,
} from "../../src/admin/instantPreview/previewSession";
import type { SchemaField } from "../../src/shared/editableSchema/editableSchema";
import type { VeDocument } from "../../src/shared/protocol";

import {
  createPreviewSession,
  REMEMBERED_TYPED_TEXTS,
} from "../../src/admin/instantPreview/previewSession";
import { buildEditableSchema } from "../../src/shared/editableSchema/editableSchema";
import {
  VE_FIELD_PATCH_TYPE,
  VE_FIELD_SNAPSHOT_TYPE,
  VE_FIELDS_RENDERED_TYPE,
  VE_RICH_TEXT_RENDERED_TYPE,
  VE_RICH_TEXT_STRUCTURE_TYPE,
} from "../../src/shared/protocol";
import { shapeOf } from "../../src/shared/richText/shapeOf";
import { fieldAddressOf } from "../../src/shared/veDocument";

import type { EditorState } from "../support/editorState";

import { editorState, paragraph, paragraphsOf, textNode } from "../support/editorState";

type FormFields = Record<string, { value: unknown; rows?: { id: string; blockType?: string }[] }>;

const PAGE_FIELDS: SchemaField[] = [
  { name: "title", type: "text" },
  { name: "summary", type: "textarea" },
  { name: "contact", type: "email" },
  { name: "price", type: "number" },
  { name: "status", type: "select", options: ["draft", "live"] },
  { name: "author", type: "relationship", relationTo: "users" },
  { name: "tenant", type: "text" },
  { name: "internalNote", type: "text", admin: { hidden: true } },
  { name: "a#b#c", type: "text" },
  { name: "body", type: "richText" },
  { name: "lockedBody", type: "richText", admin: { readOnly: true } },
  { name: "hiddenBody", type: "richText", hidden: true },
  { name: "disabledBody", type: "richText", admin: { disabled: true } },
  { name: "tenantBody", type: "richText" },
  { name: "intro#draft", type: "richText" },
  {
    name: "blocks",
    type: "blocks",
    blocks: [
      {
        slug: "hero",
        admin: { disableBlockName: true },
        fields: [
          { name: "heading", type: "text" },
          { name: "body", type: "richText" },
          { name: "id", type: "text", admin: { hidden: true } },
          { name: "blockName", type: "text", admin: { disabled: true } },
        ],
      },
    ],
  },
];

const EDITABLE_PAGE = buildEditableSchema(PAGE_FIELDS, {
  excludeFieldNames: ["tenant", "tenantBody"],
});

const HERO_ROWS = [
  { blockType: "hero", id: "row-a" },
  { blockType: "hero", id: "row-b" },
];

const SAVED_PAGE = {
  title: "Hell",
  summary: "Short",
  contact: "hi@example.com",
  price: 9,
  status: "draft",
  author: 12,
  tenant: "acme",
  internalNote: "do not publish",
  blocks: [
    { blockName: "Top", blockType: "hero", id: "row-a", heading: "First" },
    { blockName: "Bottom", blockType: "hero", id: "row-b", heading: "Second" },
  ],
};

const PAGE_FORM: FormFields = {
  title: { value: "Hell" },
  summary: { value: "Short" },
  contact: { value: "hi@example.com" },
  price: { value: 9 },
  status: { value: "draft" },
  author: { value: 12 },
  tenant: { value: "acme" },
  internalNote: { value: "do not publish" },
  blocks: { rows: HERO_ROWS, value: 2 },
  "blocks.0.id": { value: "row-a" },
  "blocks.0.blockType": { value: "hero" },
  "blocks.0.blockName": { value: "Top" },
  "blocks.0.heading": { value: "First" },
  "blocks.1.id": { value: "row-b" },
  "blocks.1.blockType": { value: "hero" },
  "blocks.1.blockName": { value: "Bottom" },
  "blocks.1.heading": { value: "Second" },
};

const OPEN_PAGE: VeDocument = { collectionSlug: "page", docId: "7", kind: "collection" };
const PAGE = { ...OPEN_PAGE, locale: "en" };

const SAVED_SNAPSHOT_FIELDS = [
  { key: "title", saved: "Hell", value: "Hell" },
  { key: "summary", saved: "Short", value: "Short" },
  { key: "contact", saved: "hi@example.com", value: "hi@example.com" },
  { key: "blocks.row-a.heading", saved: "First", value: "First" },
  { key: "blocks.row-b.heading", saved: "Second", value: "Second" },
];

const KEYS_A_PAGE_COULD_CLAIM = [
  "title",
  "summary",
  "contact",
  "blocks.row-a.heading",
  "blocks.row-b.heading",
  "blocks",
  "price",
  "tenant",
  "internalNote",
  "password",
  "blocks.row-a.blockName",
  "name",
  "email",
  "apiKey",
];

const VALID_ANNOUNCEMENT = {
  pageId: "page-load-1",
  rendered: [{ ...OPEN_PAGE, keys: ["title"] }],
  type: VE_FIELDS_RENDERED_TYPE,
};

const snapshot = (fields: object[], document: object = PAGE) => ({
  type: VE_FIELD_SNAPSHOT_TYPE,
  ...document,
  fields,
});

const patch = (patches: object[]) => ({ type: VE_FIELD_PATCH_TYPE, ...PAGE, patches });

const blockOf = (fields: object) => ({ fields, type: "block", version: 2 });

let session: PreviewSession;
let form: FormFields;
let savedDocument: Record<string, unknown>;
let locale: string;

const adminState = (): AdminState => ({
  document: { ...OPEN_PAGE, locale },
  editableSchema: EDITABLE_PAGE,
  formState: form,
  savedDocument,
});

const formChanged = () => session.formChanged(adminState());

const edit = (changes: FormFields) => {
  form = { ...form, ...changes };
  return formChanged();
};

const save = (data: Record<string, unknown>) => {
  savedDocument = data;
  return formChanged();
};

const switchLocale = (next: string) => {
  locale = next;
  session.localeChanged(next);
  return formChanged();
};

const renderedInOpenDocument = (...keys: string[]) => [{ ...OPEN_PAGE, keys }];

const announce = ({
  pageId = "page-load-1" as unknown,
  rendered = renderedInOpenDocument(...KEYS_A_PAGE_COULD_CLAIM) as unknown,
  type = VE_FIELDS_RENDERED_TYPE as string,
  locale: pageLocale = undefined as string | undefined,
} = {}) =>
  session.pageAnnounced({
    pageId,
    rendered,
    type,
    ...(pageLocale !== undefined && { locale: pageLocale }),
  });

const announceKeys = (...keys: string[]) => announce({ rendered: renderedInOpenDocument(...keys) });

const changeWatchingFormWalks = (fields: FormFields) => {
  const walkForm = vi.fn();
  const lookedUp: string[] = [];
  form = new Proxy(fields, {
    get(watched, formPath, receiver) {
      lookedUp.push(String(formPath));
      return Reflect.get(watched, formPath, receiver);
    },
    ownKeys(watched) {
      walkForm();
      return Reflect.ownKeys(watched);
    },
  });
  return { lookedUp, messages: formChanged(), walkForm };
};

const isEachLookedUpOnce = (lookedUp: readonly string[]) =>
  lookedUp.length === new Set(lookedUp).size;

const typesOf = (messages: readonly PreviewMessage[]) => messages.map(({ type }) => type);

const textsOf = (messages: readonly PreviewMessage[]) =>
  messages.flatMap((message) => [
    ...("fields" in message ? message.fields.flatMap(({ saved, value }) => [saved, value]) : []),
    ...("patches" in message ? message.patches.map(({ value }) => value) : []),
  ]);

describe("the admin preview session", () => {
  beforeEach(() => {
    session = createPreviewSession();
    form = PAGE_FORM;
    savedDocument = SAVED_PAGE;
    locale = "en";
    session.localeChanged(locale);
    formChanged();
  });

  it("sends nothing until a page announces itself", () => {
    expect(edit({ title: { value: "Hello" } })).toEqual([]);
  });

  it("answers an announcement with the saved and unsaved value of the markable fields it names", () => {
    edit({ title: { value: "Hello" } });

    expect(announce()).toEqual([
      snapshot([
        { key: "title", saved: "Hell", value: "Hello" },
        ...SAVED_SNAPSHOT_FIELDS.slice(1),
      ]),
    ]);
  });

  it("answers a cleared field and a field saved empty as empty text, and leaves out a field without text on either side", () => {
    savedDocument = { ...SAVED_PAGE, contact: 5, summary: undefined };
    edit({
      "a#b#c": { value: null },
      contact: { value: null },
      summary: { value: "Typed" },
      title: { value: null },
    });

    expect(announceKeys("title", "summary", "contact", "a#b#c")).toEqual([
      snapshot([
        { key: "title", saved: "Hell", value: "" },
        { key: "summary", saved: "", value: "Typed" },
      ]),
    ]);
  });

  describe("a page that states its locale", () => {
    it("is answered when it is the locale of the form", () => {
      expect(announce({ locale: "en" })).toEqual([snapshot(SAVED_SNAPSHOT_FIELDS)]);
    });

    it("is sent nothing when it is another locale than the form's", () => {
      expect(announce({ locale: "es" })).toEqual([]);
      expect(edit({ title: { value: "Hello" } })).toEqual([]);
    });

    it("is sent nothing when it replaced a page of the form's locale", () => {
      announce();

      expect(announce({ locale: "es", pageId: "page-load-2" })).toEqual([]);
      expect(edit({ title: { value: "Hello" } })).toEqual([]);
    });

    it("is not told the structure of a rich text when it is another locale than the form's", () => {
      const saved = paragraphsOf(["Body"]);
      savedDocument = { ...SAVED_PAGE, body: saved };
      edit({ body: { value: saved } });
      announce({
        locale: "es",
        rendered: renderedInOpenDocument("body"),
        type: VE_RICH_TEXT_RENDERED_TYPE,
      });

      expect(edit({ body: { value: paragraphsOf(["Body"], ["New"]) } })).toEqual([]);
    });

    it("is answered again once the form is in its locale", () => {
      announce({ locale: "es" });
      switchLocale("es");

      expect(announce({ locale: "es", pageId: "page-load-2" })).toEqual([
        snapshot(SAVED_SNAPSHOT_FIELDS, { ...PAGE, locale: "es" }),
      ]);
    });
  });

  it("answers again when the page announces itself after a reload", () => {
    announce();

    expect(announce({ pageId: "page-load-2" })).toEqual([snapshot(SAVED_SNAPSHOT_FIELDS)]);
  });

  it("answers only the fields the page names", () => {
    expect(announceKeys("title", "blocks.row-b.heading")).toEqual([
      snapshot([
        { key: "title", saved: "Hell", value: "Hell" },
        { key: "blocks.row-b.heading", saved: "Second", value: "Second" },
      ]),
    ]);
  });

  it("patches no field the page has not announced", () => {
    announceKeys("title");

    expect(edit({ summary: { value: "Longer" }, "blocks.0.heading": { value: "First!" } })).toEqual(
      []
    );
  });

  it("answers a later announcement with the newly announced fields only", () => {
    announceKeys("title");
    edit({ summary: { value: "Longer" } });

    expect(announceKeys("summary")).toEqual([
      snapshot([{ key: "summary", saved: "Short", value: "Longer" }]),
    ]);
  });

  it("keeps patching every field announced since the page loaded", () => {
    announceKeys("title");
    announceKeys("summary");

    expect(edit({ summary: { value: "Longer" }, title: { value: "Hello" } })).toEqual([
      patch([
        { key: "title", value: "Hello" },
        { key: "summary", value: "Longer" },
      ]),
    ]);
  });

  it("answers a field that is announced again with its values again", () => {
    announceKeys("title");

    expect(announceKeys("title")).toEqual([
      snapshot([{ key: "title", saved: "Hell", value: "Hell" }]),
    ]);
  });

  it("forgets the fields of a page load the preview has left", () => {
    announceKeys("title");
    announce({ pageId: "page-load-2", rendered: renderedInOpenDocument("summary") });

    expect(edit({ summary: { value: "Longer" }, title: { value: "Hello" } })).toEqual([
      patch([{ key: "summary", value: "Longer" }]),
    ]);
  });

  describe("when the preview leaves its page", () => {
    it("sends nothing until the next page announces itself", () => {
      announce();
      session.pageLeft();

      expect(edit({ title: { value: "Hello" } })).toEqual([]);
      expect(save({ ...SAVED_PAGE, title: "Hello" })).toEqual([]);
    });

    it("answers the page that announces itself next and patches it", () => {
      announce();
      session.pageLeft();

      expect(typesOf(announceKeys("title"))).toEqual([VE_FIELD_SNAPSHOT_TYPE]);
      expect(typesOf(edit({ title: { value: "Hello" } }))).toEqual([VE_FIELD_PATCH_TYPE]);
    });
  });

  it("sends nothing when the page renders fields of other documents only", () => {
    announce({
      rendered: [
        { collectionSlug: "page", docId: "8", keys: ["title"], kind: "collection" },
        { collectionSlug: "page", keys: ["title"], kind: "global" },
        { collectionSlug: "post", docId: "7", keys: ["title"], kind: "collection" },
      ],
    });

    expect(edit({ title: { value: "Hello" } })).toEqual([]);
  });

  it.each([
    ["no list of fields", { ...VALID_ANNOUNCEMENT, rendered: null }],
    ["a list that is not a list", { ...VALID_ANNOUNCEMENT, rendered: "everything" }],
    ["a document without keys", { ...VALID_ANNOUNCEMENT, rendered: [OPEN_PAGE] }],
    ["keys that are not text", { ...VALID_ANNOUNCEMENT, rendered: [{ ...OPEN_PAGE, keys: [1] }] }],
    ["no page load", { ...VALID_ANNOUNCEMENT, pageId: null }],
    ["a page load that is not text", { ...VALID_ANNOUNCEMENT, pageId: 7 }],
    ["another message type", { ...VALID_ANNOUNCEMENT, type: "ve:something-else" }],
    ["a message that is not an object", VE_FIELDS_RENDERED_TYPE],
  ])("sends nothing to a page that announces itself with %s", (_label, message) => {
    expect(session.pageAnnounced(message)).toEqual([]);
    expect(edit({ title: { value: "Hello" } })).toEqual([]);
  });

  it("patches a typed change under the field key of its field", () => {
    announce();

    expect(edit({ "blocks.1.heading": { value: "Second!" } })).toEqual([
      patch([{ key: "blocks.row-b.heading", value: "Second!" }]),
    ]);
  });

  it("patches nothing when rows only change their order", () => {
    announce();

    expect(
      edit({
        blocks: { rows: [...HERO_ROWS].reverse(), value: 2 },
        "blocks.0.heading": { value: "Second" },
        "blocks.1.heading": { value: "First" },
      })
    ).toEqual([]);
  });

  it("keeps addressing a moved row by its key", () => {
    announce();
    edit({
      blocks: { rows: [...HERO_ROWS].reverse(), value: 2 },
      "blocks.0.heading": { value: "Second" },
      "blocks.1.heading": { value: "First" },
    });

    expect(edit({ "blocks.0.heading": { value: "Second!" } })).toEqual([
      patch([{ key: "blocks.row-b.heading", value: "Second!" }]),
    ]);
  });

  it("patches nothing for a row the page has not announced", () => {
    announce();
    edit({
      blocks: { rows: [...HERO_ROWS, { blockType: "hero", id: "row-new" }], value: 3 },
      "blocks.2.heading": { value: "" },
    });

    expect(edit({ "blocks.2.heading": { value: "Draft" } })).toEqual([]);
  });

  it("answers nothing for a row the saved document does not have", () => {
    edit({
      blocks: { rows: [...HERO_ROWS, { blockType: "hero", id: "row-new" }], value: 3 },
      "blocks.2.heading": { value: "Draft" },
    });

    expect(
      announce({
        rendered: renderedInOpenDocument(...KEYS_A_PAGE_COULD_CLAIM, "blocks.row-new.heading"),
      })
    ).toEqual([snapshot(SAVED_SNAPSHOT_FIELDS)]);
  });

  it("patches nothing for a field that appears in the form after the answer", () => {
    announce({
      rendered: renderedInOpenDocument(...KEYS_A_PAGE_COULD_CLAIM, "blocks.row-new.heading"),
    });

    expect(
      edit({
        blocks: { rows: [...HERO_ROWS, { blockType: "hero", id: "row-new" }], value: 3 },
        "blocks.2.heading": { value: "New row" },
      })
    ).toEqual([]);
  });

  it("patches nothing for a field of a row the form no longer has", () => {
    announce();

    expect(
      edit({ blocks: { rows: [], value: 0 }, "blocks.0.heading": { value: "Removed" } })
    ).toEqual([]);
  });

  it("patches a cleared text field as empty text and the text typed into it afterwards", () => {
    announce();

    expect(edit({ title: { value: null } })).toEqual([patch([{ key: "title", value: "" }])]);
    expect(edit({ title: { value: "Hello" } })).toEqual([
      patch([{ key: "title", value: "Hello" }]),
    ]);
  });

  it("never patches a field that cannot carry a marker", () => {
    announce();

    expect(
      edit({
        price: { value: 10 },
        status: { value: "live" },
        author: { value: 13 },
        tenant: { value: "globex" },
        internalNote: { value: "still secret" },
        password: { value: "hunter2" },
        "blocks.0.blockName": { value: "Renamed" },
        "blocks.0.blockType": { value: "banner" },
      })
    ).toEqual([]);
  });

  it("patches nothing when no text changed", () => {
    announce();

    expect(edit({ title: { value: "Hell" } })).toEqual([]);
  });

  it("sends the saved values of every field announced since the page loaded when the document is saved", () => {
    announce();
    edit({ title: { value: "Hello" } });

    expect(
      save({ ...SAVED_PAGE, title: "Hello", blocks: [...SAVED_PAGE.blocks].reverse() })
    ).toEqual([
      snapshot([
        { key: "title", saved: "Hello", value: "Hello" },
        ...SAVED_SNAPSHOT_FIELDS.slice(1),
      ]),
    ]);
  });

  it("patches only what changed after the answer to an announcement", () => {
    edit({ summary: { value: "Longer" } });
    announce();

    expect(edit({ title: { value: "Hello" } })).toEqual([
      patch([{ key: "title", value: "Hello" }]),
    ]);
  });

  it("answers nothing while there is no open document, but records the page", () => {
    session.formChanged(null);

    expect(announce()).toEqual([]);
    expect(edit({ title: { value: "Hello" } })).toEqual([]);
    expect(typesOf(edit({ title: { value: "Hello!" } }))).toEqual([VE_FIELD_PATCH_TYPE]);
  });

  describe("rich text", () => {
    const nodeKey = (fieldKey: string, value: unknown, address: string, document = OPEN_PAGE) =>
      `${fieldKey}#${shapeOf(value, fieldAddressOf(document, fieldKey))}#${address}`;

    const SAVED_BODY = paragraphsOf(["Hello ", "world"], ["Second"]);
    const FIRST_ROW_BODY = paragraphsOf(["First body"]);
    const SECOND_ROW_BODY = paragraphsOf(["Second body"]);
    const LOCKED_BODY = paragraphsOf(["Locked"]);

    const SAVED_RICH_PAGE = {
      ...SAVED_PAGE,
      "a#b#c": "Plain",
      blocks: [
        { ...SAVED_PAGE.blocks[0], body: FIRST_ROW_BODY },
        { ...SAVED_PAGE.blocks[1], body: SECOND_ROW_BODY },
      ],
      body: SAVED_BODY,
      disabledBody: LOCKED_BODY,
      hiddenBody: LOCKED_BODY,
      "intro#draft": LOCKED_BODY,
      lockedBody: LOCKED_BODY,
      tenantBody: LOCKED_BODY,
    };

    const RICH_PAGE_FORM: FormFields = {
      ...PAGE_FORM,
      "a#b#c": { value: "Plain" },
      "blocks.0.body": { value: FIRST_ROW_BODY },
      "blocks.1.body": { value: SECOND_ROW_BODY },
      body: { value: SAVED_BODY },
      disabledBody: { value: LOCKED_BODY },
      hiddenBody: { value: LOCKED_BODY },
      "intro#draft": { value: LOCKED_BODY },
      lockedBody: { value: LOCKED_BODY },
      tenantBody: { value: LOCKED_BODY },
    };

    const BODY_NODE_KEYS = ["0.0", "0.1", "1.0"].map((address) =>
      nodeKey("body", SAVED_BODY, address)
    );
    const [HELLO_KEY, WORLD_KEY, SECOND_KEY] = BODY_NODE_KEYS as [string, string, string];
    const SECOND_ROW_KEY = nodeKey("blocks.row-b.body", SECOND_ROW_BODY, "0.0");
    const SECOND_ROW_ENTRY = { key: SECOND_ROW_KEY, saved: "Second body", value: "Second body" };

    const SAVED_BODY_ENTRIES = [
      { key: HELLO_KEY, saved: "Hello ", value: "Hello " },
      { key: WORLD_KEY, saved: "world", value: "world" },
      { key: SECOND_KEY, saved: "Second", value: "Second" },
    ];

    const connectBody = () => announceKeys(...BODY_NODE_KEYS, SECOND_ROW_KEY);

    const editBody = (...paragraphs: string[][]) =>
      edit({ body: { value: paragraphsOf(...paragraphs) } });

    beforeEach(() => {
      savedDocument = SAVED_RICH_PAGE;
      form = RICH_PAGE_FORM;
      formChanged();
    });

    it("answers the announced text leaves with their saved and their unsaved text", () => {
      editBody(["Hello, ", "world"], ["Second"]);

      expect(connectBody()).toEqual([
        snapshot([
          SECOND_ROW_ENTRY,
          { key: HELLO_KEY, saved: "Hello ", value: "Hello, " },
          ...SAVED_BODY_ENTRIES.slice(1),
        ]),
      ]);
    });

    it("answers only the text leaves the page names", () => {
      expect(announceKeys(WORLD_KEY)).toEqual([snapshot([SAVED_BODY_ENTRIES[1] as object])]);
    });

    it("patches a keystroke as exactly the text leaf that changed, and its return to the saved text", () => {
      connectBody();

      expect(editBody(["Hello ", "world"], ["Second!"])).toEqual([
        patch([{ key: SECOND_KEY, value: "Second!" }]),
      ]);
      expect(editBody(["Hello ", "world"], ["Second"])).toEqual([
        patch([{ key: SECOND_KEY, value: "Second" }]),
      ]);
    });

    it("patches a text leaf whose formatting changed along with its text", () => {
      connectBody();
      const bold = 1;

      expect(
        edit({
          body: {
            value: editorState(
              paragraph(textNode("Hello, ", bold), textNode("world")),
              paragraph(textNode("Second"))
            ),
          },
        })
      ).toEqual([patch([{ key: HELLO_KEY, value: "Hello, " }])]);
    });

    it("walks an unchanged editor state once however often the form changes", () => {
      let walks = 0;
      const counted = (value: EditorState) => ({
        root: {
          ...value.root,
          get children() {
            walks += 1;
            return value.root.children;
          },
        },
      });
      save({ ...SAVED_RICH_PAGE, body: counted(SAVED_BODY) });
      connectBody();

      expect(
        edit({ body: { value: counted(paragraphsOf(["Hello!", "world"], ["Second"])) } })
      ).toEqual([patch([{ key: HELLO_KEY, value: "Hello!" }])]);

      const walksOfChange = walks;
      edit({ title: { value: "Hello" } });

      expect(walksOfChange).toBeGreaterThan(0);
      expect(walks).toBe(walksOfChange);
    });

    it("reads a rich text anew for another field that holds the same editor state", () => {
      const shared = paragraphsOf(["Hello, ", "world"], ["Second"]);
      const firstRowKey = nodeKey("blocks.row-a.body", SAVED_BODY, "0.0");
      const [firstRow, secondRow] = SAVED_RICH_PAGE.blocks;
      save({ ...SAVED_RICH_PAGE, blocks: [{ ...firstRow, body: SAVED_BODY }, secondRow] });
      edit({ "blocks.0.body": { value: shared }, body: { value: shared } });

      expect(announceKeys(firstRowKey, HELLO_KEY)).toEqual([
        snapshot([
          { key: firstRowKey, saved: "Hello ", value: "Hello, " },
          { key: HELLO_KEY, saved: "Hello ", value: "Hello, " },
        ]),
      ]);
    });

    it("keeps addressing the rich text of a moved row by the key of the row", () => {
      connectBody();
      edit({
        blocks: { rows: [...HERO_ROWS].reverse(), value: 2 },
        "blocks.0.body": { value: SECOND_ROW_BODY },
        "blocks.1.body": { value: FIRST_ROW_BODY },
      });

      expect(edit({ "blocks.0.body": { value: paragraphsOf(["Second body!"]) } })).toEqual([
        patch([{ key: SECOND_ROW_KEY, value: "Second body!" }]),
      ]);
    });

    it("patches nothing while the editor holds a structure of another shape", () => {
      connectBody();

      expect([
        ...editBody(["Hello ", "world"], ["Second"], [""]),
        ...editBody(["Hello ", "world"], ["Second"], ["New paragraph"]),
        ...editBody(["Hello!", "world"], ["Second"], ["New paragraph"]),
      ]).toEqual([]);
    });

    it("patches nothing when the structure returns to the saved shape with the text it had", () => {
      connectBody();
      editBody(["Hello ", "world"], ["Second"], ["New"]);

      expect(editBody(["Hello ", "world"], ["Second"])).toEqual([]);
    });

    it("patches the text leaf that changed while the structure had another shape", () => {
      connectBody();
      editBody(["Hello ", "world"], ["Second!"]);
      editBody(["Hello ", "world"], ["Second!"], ["New"]);
      editBody(["Hello ", "there"], ["Second!"], ["New"]);

      expect(editBody(["Hello ", "there"], ["Second!"])).toEqual([
        patch([{ key: WORLD_KEY, value: "there" }]),
      ]);
    });

    it("patches nothing when Lexical merges the text leaves of imported content", () => {
      connectBody();

      expect([
        ...editBody(["Hello world!"], ["Second"]),
        ...editBody(["Hello world!!"], ["Second"]),
      ]).toEqual([]);
    });

    it("sends the new saved text of the announced text leaves when the document is saved", () => {
      connectBody();
      const typed = paragraphsOf(["Hello ", "world"], ["Second!"]);
      edit({ body: { value: typed } });

      expect(save({ ...SAVED_RICH_PAGE, body: typed })).toEqual([
        snapshot([
          SECOND_ROW_ENTRY,
          ...SAVED_BODY_ENTRIES.slice(0, 2),
          { key: SECOND_KEY, saved: "Second!", value: "Second!" },
        ]),
      ]);
    });

    it("stops answering the keys of a shape the saved document no longer has", () => {
      connectBody();
      const restructured = paragraphsOf(["Hello ", "world"], ["Second"], ["Third"]);
      const thirdKey = nodeKey("body", restructured, "2.0");
      edit({ body: { value: restructured } });

      expect(save({ ...SAVED_RICH_PAGE, body: restructured })).toEqual([
        snapshot([SECOND_ROW_ENTRY]),
      ]);
      expect(announceKeys(HELLO_KEY, thirdKey)).toEqual([
        snapshot([{ key: thirdKey, saved: "Third", value: "Third" }]),
      ]);
      expect(editBody(["Hello!", "world"], ["Second"], ["Third!"])).toEqual([
        patch([{ key: thirdKey, value: "Third!" }]),
      ]);
    });

    describe("while the editor holds another shape than the saved document", () => {
      const TYPED = paragraphsOf(["Hello ", "world"], ["Second!"]);
      const TYPED_WITH_NEW_PARAGRAPH = paragraphsOf(["Hello ", "world"], ["Second!"], [""]);

      const bodySnapshot = (second: { saved: string; value: string }) => [
        snapshot([
          SECOND_ROW_ENTRY,
          ...SAVED_BODY_ENTRIES.slice(0, 2),
          { key: SECOND_KEY, ...second },
        ]),
      ];

      const savedBody = (second: string) => ({
        ...SAVED_RICH_PAGE,
        body: paragraphsOf(["Hello ", "world"], [second]),
      });

      it("keeps the text typed last when a save leaves the saved text as it was", () => {
        connectBody();
        edit({ body: { value: TYPED } });
        edit({ body: { value: TYPED_WITH_NEW_PARAGRAPH } });

        expect(save({ ...SAVED_RICH_PAGE, title: "Hello" })).toEqual(
          bodySnapshot({ saved: "Second", value: "Second!" })
        );
      });

      it("sends the saved text when a save brings text the editor never held", () => {
        connectBody();
        edit({ body: { value: TYPED } });
        edit({ body: { value: TYPED_WITH_NEW_PARAGRAPH } });

        expect(save(savedBody("Restored"))).toEqual(
          bodySnapshot({ saved: "Restored", value: "Restored" })
        );
      });

      it("sends each saved text when saves of the saved shape land that the editor never held", () => {
        connectBody();
        edit({ body: { value: TYPED_WITH_NEW_PARAGRAPH } });
        save(savedBody("Restored"));

        expect(save({ ...SAVED_RICH_PAGE, body: TYPED })).toEqual(
          bodySnapshot({ saved: "Second!", value: "Second!" })
        );
      });

      it("keeps the text typed last through two saves from before the new paragraph", () => {
        connectBody();
        edit({ body: { value: TYPED } });
        editBody(["Hello ", "world"], ["Second!!"]);
        editBody(["Hello ", "world"], ["Second!!!"]);
        editBody(["Hello ", "world"], ["Second!!!"], [""]);
        save({ ...SAVED_RICH_PAGE, body: TYPED });

        expect(save(savedBody("Second!!"))).toEqual(
          bodySnapshot({ saved: "Second!!", value: "Second!!!" })
        );
      });

      it.each([
        ["forgets a typed text older than the limit", "Second 1", "Second 1"],
        [
          "remembers the typed texts within the limit",
          "Second 2",
          `Second ${REMEMBERED_TYPED_TEXTS + 1}`,
        ],
      ])("%s", (_label, savedText, value) => {
        connectBody();
        for (let index = 0; index < REMEMBERED_TYPED_TEXTS + 2; index += 1) {
          editBody(["Hello ", "world"], [`Second ${index}`]);
        }
        editBody(["Hello ", "world"], [`Second ${REMEMBERED_TYPED_TEXTS + 1}`], [""]);

        expect(save(savedBody(savedText))).toEqual(bodySnapshot({ saved: savedText, value }));
      });

      it("answers the first announcement of a new page load from a fresh read of the form", () => {
        connectBody();
        edit({ body: { value: TYPED } });
        edit({ body: { value: TYPED_WITH_NEW_PARAGRAPH } });

        expect(
          announce({ pageId: "page-load-2", rendered: renderedInOpenDocument(SECOND_KEY) })
        ).toEqual([snapshot([{ key: SECOND_KEY, saved: "Second", value: "Second" }])]);
      });

      it("answers the next page load with the saved text, or with a save made while no page listened", () => {
        const reannounce = (pageId: string) =>
          announce({ pageId, rendered: renderedInOpenDocument(SECOND_KEY) });
        connectBody();
        edit({ body: { value: TYPED } });
        session.pageLeft();
        editBody(["Hello ", "world"], ["Second!!"]);
        editBody(["Hello ", "world"], ["Second!!"], [""]);

        expect(reannounce("page-load-2")).toEqual([
          snapshot([{ key: SECOND_KEY, saved: "Second", value: "Second" }]),
        ]);

        session.pageLeft();
        save(savedBody("Second, much later"));

        expect(reannounce("page-load-3")).toEqual([
          snapshot([{ key: SECOND_KEY, saved: "Second, much later", value: "Second, much later" }]),
        ]);
      });
    });

    describe("when the admin switches to another locale", () => {
      const SAVED_IN_GERMAN = paragraphsOf(["Hallo ", "Welt"], ["Zweiter"]);
      const GERMAN_ANSWER = [
        snapshot(
          [
            { key: HELLO_KEY, saved: "Hallo ", value: "Hallo " },
            { key: WORLD_KEY, saved: "Welt", value: "Welt" },
            { key: SECOND_KEY, saved: "Zweiter", value: "Zweiter" },
          ],
          { ...PAGE, locale: "de" }
        ),
      ];

      const typeBeforeNewParagraph = () => {
        connectBody();
        editBody(["Hello ", "world"], ["Second!"]);
        editBody(["Hello ", "world"], ["Second!"], [""]);
      };

      const receiveGermanDocument = () => {
        form = { ...form, body: { value: SAVED_IN_GERMAN } };
        return save({ ...SAVED_RICH_PAGE, body: SAVED_IN_GERMAN });
      };

      const loadGermanPage = () => {
        session.pageLeft();
        return announce({
          pageId: "page-load-2",
          rendered: renderedInOpenDocument(...BODY_NODE_KEYS),
        });
      };

      it("sends nothing to the page of the locale it left when the locale changes before the document", () => {
        typeBeforeNewParagraph();

        expect([...switchLocale("de"), ...receiveGermanDocument()]).toEqual([]);
      });

      it("answers the page of the new locale when the locale changed before the document", () => {
        typeBeforeNewParagraph();
        switchLocale("de");
        receiveGermanDocument();

        expect(loadGermanPage()).toEqual(GERMAN_ANSWER);
      });

      it("sends nothing to the page of the locale it left when the document changes before the locale", () => {
        typeBeforeNewParagraph();
        receiveGermanDocument();

        expect([...switchLocale("de"), ...editBody(["Hallo ", "Welt"], ["Zweiter!"])]).toEqual([]);
      });

      it("answers the page of the new locale when the document changed before the locale", () => {
        typeBeforeNewParagraph();
        receiveGermanDocument();
        switchLocale("de");

        expect(loadGermanPage()).toEqual(GERMAN_ANSWER);
      });

      it("ignores what the page of the locale it left announces later", () => {
        typeBeforeNewParagraph();
        switchLocale("de");

        expect([
          ...announceKeys(...BODY_NODE_KEYS),
          ...editBody(["Hello ", "world"], ["Second!?"]),
        ]).toEqual([]);
      });
    });

    it("ignores a node key that names no text leaf of a rich text field", () => {
      const bodyShape = shapeOf(SAVED_BODY, fieldAddressOf(OPEN_PAGE, "body"));

      expect([
        ...announceKeys(
          nodeKey("title", SAVED_BODY, "0.0"),
          nodeKey("missing", SAVED_BODY, "0.0"),
          nodeKey("blocks.row-zz.body", FIRST_ROW_BODY, "0.0"),
          "body#stale#0.0",
          `body#${bodyShape}#9.9`,
          `body#${bodyShape}#`,
          `body#${bodyShape}`,
          `body#${bodyShape}#0.0#0`,
          "body",
          "body##"
        ),
        ...editBody(["Hello!", "world"], ["Second"]),
      ]).toEqual([]);
    });

    it("answers for a text field whose name looks like a node key as for any text field", () => {
      expect([...announceKeys("a#b#c"), ...edit({ "a#b#c": { value: "Plain!" } })]).toEqual([
        snapshot([{ key: "a#b#c", saved: "Plain", value: "Plain" }]),
        patch([{ key: "a#b#c", value: "Plain!" }]),
      ]);
    });

    it("never answers for rich text the editor cannot change or the plugin leaves out", () => {
      const outOfReach = ["lockedBody", "hiddenBody", "disabledBody", "tenantBody", "intro#draft"];

      expect([
        ...announceKeys(...outOfReach.map((fieldKey) => nodeKey(fieldKey, LOCKED_BODY, "0.0"))),
        ...edit(
          Object.fromEntries(
            outOfReach.map((fieldKey) => [fieldKey, { value: paragraphsOf(["Unlocked"]) }])
          )
        ),
      ]).toEqual([]);
    });

    it("does not answer for the text leaves of a row the saved document does not have", () => {
      const draftBody = paragraphsOf(["Draft"]);
      edit({
        blocks: { rows: [...HERO_ROWS, { blockType: "hero", id: "row-new" }], value: 3 },
        "blocks.2.body": { value: draftBody },
      });

      expect([
        ...announceKeys(nodeKey("blocks.row-new.body", draftBody, "0.0")),
        ...edit({ "blocks.2.body": { value: paragraphsOf(["Draft!"]) } }),
      ]).toEqual([]);
    });

    it("never sends a rich text value as a whole", () => {
      const sent = [
        ...announceKeys(
          ...KEYS_A_PAGE_COULD_CLAIM,
          ...BODY_NODE_KEYS,
          SECOND_ROW_KEY,
          "body",
          "blocks.row-b.body"
        ),
        ...edit({
          body: { value: paragraphsOf(["Hello!", "world"], ["Second"]) },
          "blocks.1.body": { value: paragraphsOf(["Second body!"]) },
        }),
        ...save({ ...SAVED_RICH_PAGE, body: paragraphsOf(["Hello!", "world"], ["Second"]) }),
      ];

      expect(sent).toHaveLength(3);
      expect(textsOf(sent).every((text) => typeof text === "string")).toBe(true);
      expect(JSON.stringify(sent)).not.toContain('"root"');
    });

    describe("with a live rich text on the page", () => {
      const WITH_NEW_PARAGRAPH = paragraphsOf(["Hello ", "world"], ["Second"], ["New"]);

      const structureOf = (state: object | null, fieldKey = "body") => ({
        type: VE_RICH_TEXT_STRUCTURE_TYPE,
        ...PAGE,
        key: fieldKey,
        shape: shapeOf(state, fieldAddressOf(OPEN_PAGE, fieldKey)),
        state,
      });

      const announceLiveRichTexts = (announcement: object = {}) =>
        announce({
          rendered: renderedInOpenDocument("body"),
          type: VE_RICH_TEXT_RENDERED_TYPE,
          ...announcement,
        });

      const connectLiveBody = () => {
        announceLiveRichTexts();
        connectBody();
      };

      const structuresIn = (messages: readonly PreviewMessage[]) =>
        messages.filter(({ type }) => type === VE_RICH_TEXT_STRUCTURE_TYPE);

      it("tells a block of the editor state without the values of its fields", () => {
        const withBlock = (fields: object) => ({
          root: { ...SAVED_BODY.root, children: [...SAVED_BODY.root.children, blockOf(fields)] },
        });
        const edited = withBlock({ apiKey: "secret", blockType: "callout", id: "b1", text: "Hi" });
        connectLiveBody();

        expect(structuresIn(edit({ body: { value: edited } }))).toEqual([
          { ...structureOf(edited), state: withBlock({ blockType: "callout", id: "b1" }) },
        ]);
      });

      it("walks the form once to answer a live rich text announcement", () => {
        const { walkForm } = changeWatchingFormWalks(RICH_PAGE_FORM);

        announceLiveRichTexts();

        expect(walkForm).toHaveBeenCalledTimes(1);
      });

      it("walks the form once per change while only a live rich text is announced", () => {
        announceLiveRichTexts();

        const { messages, walkForm } = changeWatchingFormWalks({
          ...RICH_PAGE_FORM,
          body: { value: WITH_NEW_PARAGRAPH },
        });

        expect(walkForm).toHaveBeenCalledTimes(1);
        expect(messages).toEqual([structureOf(WITH_NEW_PARAGRAPH)]);
      });

      it("tells no structure for a rich text field the page has no live rich text for", () => {
        connectLiveBody();

        expect(
          edit({ "blocks.1.body": { value: paragraphsOf(["Second body"], ["New"]) } })
        ).toEqual([]);
      });

      it.each(["lockedBody", "hiddenBody", "disabledBody", "tenantBody", "intro#draft"])(
        "tells no structure of %s, which carries no marker, to a page that claims it",
        (fieldName) => {
          announceLiveRichTexts({ rendered: renderedInOpenDocument(fieldName) });

          expect(edit({ [fieldName]: { value: paragraphsOf(["Locked"], ["New"]) } })).toEqual([]);
        }
      );

      it("tells the structure of every live rich text that changed it", () => {
        const rowWithNewParagraph = paragraphsOf(["Second body"], ["New"]);
        announceLiveRichTexts({ rendered: renderedInOpenDocument("body", "blocks.row-b.body") });

        expect(
          edit({
            "blocks.1.body": { value: rowWithNewParagraph },
            body: { value: WITH_NEW_PARAGRAPH },
          })
        ).toEqual([
          structureOf(rowWithNewParagraph, "blocks.row-b.body"),
          structureOf(WITH_NEW_PARAGRAPH),
        ]);
      });

      it.each([
        ["without a page load", { pageId: null }],
        ["without fields", { rendered: "body" }],
      ])("ignores an announcement of live rich text %s", (_name, announcement) => {
        announceLiveRichTexts(announcement);

        expect(edit({ body: { value: WITH_NEW_PARAGRAPH } })).toEqual([]);
      });

      it.each([
        [
          "to the page of a locale the admin has left",
          () => {
            switchLocale("de");
            announceLiveRichTexts();
          },
        ],
        ["once the preview has left the page", () => session.pageLeft()],
      ])("tells no structure %s", (_label, leavePage) => {
        connectLiveBody();
        leavePage();

        expect(edit({ body: { value: WITH_NEW_PARAGRAPH } })).toEqual([]);
      });
    });
  });

  describe("walking the form", () => {
    const EDITED_PAGE_FORM: FormFields = { ...PAGE_FORM, title: { value: "Hello" } };

    it("walks the form and reads each of its paths once per announcement and once per change while a page listens", () => {
      const { lookedUp, walkForm } = changeWatchingFormWalks(EDITED_PAGE_FORM);

      announce();

      expect(walkForm).toHaveBeenCalledTimes(1);
      expect(isEachLookedUpOnce(lookedUp)).toBe(true);

      const changed = changeWatchingFormWalks({
        ...EDITED_PAGE_FORM,
        summary: { value: "Longer" },
      });

      expect(changed.walkForm).toHaveBeenCalledTimes(1);
      expect(isEachLookedUpOnce(changed.lookedUp)).toBe(true);
      expect(changed.messages).toEqual([patch([{ key: "summary", value: "Longer" }])]);
    });

    it("does not walk the form while no page listens", () => {
      expect(changeWatchingFormWalks(EDITED_PAGE_FORM).walkForm).not.toHaveBeenCalled();

      announce();
      session.pageLeft();

      expect(changeWatchingFormWalks(EDITED_PAGE_FORM).walkForm).not.toHaveBeenCalled();

      announce({ pageId: "page-load-2" });
      session.localeChanged("de");

      expect(changeWatchingFormWalks(EDITED_PAGE_FORM).walkForm).not.toHaveBeenCalled();
    });
  });
});
