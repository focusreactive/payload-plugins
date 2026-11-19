import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { LiveRichTextField } from "../../src/shared/protocol";
import type { EditorNode } from "../../src/shared/richText/editorNodes";

import { optimisticValueOf } from "../../src/client/instantPreview/unsavedRender/optimisticValue";
import { readUnsavedRichText } from "../../src/index";
import { withoutBlockFields } from "../../src/shared/richText/blockNodes";
import { META_KEY } from "../../src/shared/shared";
import { keyedFieldAddressOf } from "../../src/shared/veDocument";

import { valueAt } from "../support/markedData";
import { START_TIMEOUT_MS, startRealPayload } from "../support/realPayload";
import { article, page, readStored, seedPages } from "../support/richTextPages";
import { EDITOR, signIn } from "../support/unsavedRichTextRequests";

type Story = { root: { children: EditorNode[] } };

const BOLD = 1;

const text = (value: string, format = 0) => ({
  detail: 0,
  format,
  mode: "normal",
  style: "",
  text: value,
  type: "text",
  version: 1,
});

const element = (type: string, children: object[], extra: object = {}) => ({
  children,
  direction: null,
  format: "",
  indent: 0,
  type,
  version: 1,
  ...extra,
});

const editorWith = (story: Story, change: (children: EditorNode[]) => EditorNode[]): Story => {
  const edited = structuredClone(story);
  edited.root.children = change(edited.root.children);
  return edited;
};

const moved = (children: EditorNode[], type: string) => [
  ...children.filter((node) => node.type === type),
  ...children.filter((node) => node.type !== type),
];

const EDITS: [string, (children: EditorNode[]) => EditorNode[]][] = [
  ["a new paragraph", (children) => [...children, element("paragraph", [text("New")])]],
  [
    "a new list",
    (children) => [
      ...children,
      element(
        "list",
        [
          element("listitem", [text("One")], { value: 1 }),
          element("listitem", [text("Two")], { value: 2 }),
        ],
        { listType: "bullet", start: 1, tag: "ul" }
      ),
    ],
  ],
  [
    "a bold part of a paragraph",
    ([first, ...rest]) => [
      { ...first, children: [text("Hel"), text("lo ", BOLD)] } as EditorNode,
      ...rest,
    ],
  ],
  [
    "a new link to a URL",
    (children) => [
      ...children,
      element("paragraph", [
        element("link", [text("Elsewhere")], {
          fields: { linkType: "custom", newTab: true, url: "https://posted.example" },
          id: "link-new",
        }),
      ]),
    ],
  ],
  ["a saved block moved to the top", (children) => moved(children, "block")],
  ["a saved upload moved to the top", (children) => moved(children, "upload")],
];

describe("the value the page builds from an unsaved state and the saved value it was given", () => {
  let payload: Payload;
  let editor: Headers;
  let field: LiveRichTextField;
  let story: Story;

  const read = (depth: number, state?: unknown) =>
    readUnsavedRichText({
      depth,
      headers: editor,
      payload,
      request: { field, locale: "en", ...(state !== undefined && { state }) },
    });

  beforeAll(async () => {
    payload = await startRealPayload({
      canReadGuardedBody: () => true,
      name: "optimistic-parity",
      plugin: { instantPreview: true },
    });
    const pages = await seedPages(payload);
    editor = await signIn(payload, EDITOR);
    const photo = await payload.create({
      collection: "media",
      data: { alt: "A harbour", credits: [{ name: "Ada" }] },
      file: { data: Buffer.from("photo"), mimetype: "text/plain", name: "photo.txt", size: 5 },
    });
    const author = await payload.create({ collection: "authors", data: { name: "Ann" } });

    const saved = article();
    saved.root.children.push(
      element("paragraph", [
        element("link", [text("Linked page")], {
          fields: {
            credit: author.id,
            doc: { relationTo: "pages", value: Number(pages.linked) },
            linkType: "internal",
            newTab: false,
          },
          id: "link-saved",
        }),
      ]) as never,
      {
        fields: { blockType: "callout", id: "callout-saved", image: photo.id, text: "Saved" },
        format: "",
        type: "block",
        version: 2,
      } as never,
      {
        fields: { credit: author.id },
        format: "",
        id: "upload-saved",
        relationTo: "media",
        type: "upload",
        value: photo.id,
        version: 3,
      } as never
    );
    await payload.update({
      collection: "pages",
      data: { story: saved },
      draft: true,
      id: pages.article,
    });
    field = { ...page(pages.article), key: "story" };
    story = withoutBlockFields(
      (await readStored(payload, pages.article)).story as Record<string, unknown>
    ) as Story;
  }, START_TIMEOUT_MS);

  afterAll(() => payload.destroy());

  describe.each([0, 1, 2])("at depth %i", (depth) => {
    it.each(EDITS)("equals what readUnsavedRichText answers for %s", async (_name, change) => {
      const state = editorWith(story, change);
      const base = await read(depth);

      const built = optimisticValueOf(
        state,
        { fieldAddress: keyedFieldAddressOf(field), meta: valueAt(base, META_KEY) },
        base
      );

      const answer = await read(depth, state);
      expect(answer).not.toBeNull();
      expect(built).toEqual(answer);
    });
  });

  it("compares populated documents at depth 1", async () => {
    const answer = await read(
      1,
      editorWith(story, (children) => moved(children, "upload"))
    );

    expect(valueAt(answer, "root.children.0.value")).toMatchObject({ filename: "photo.txt" });
    expect(valueAt(answer, "root.children.0.fields.credit")).toMatchObject({
      name: expect.any(String),
    });
    expect(JSON.stringify(answer)).toContain('"linkType":"internal"');
  });
});
