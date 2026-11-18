import type { Payload } from "payload";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Rest } from "../support/restRequests";

import { readUnsavedRichText } from "../../src/index";
import { VE_PREVIEW_GRANT_PATH, VE_UNSAVED_RICH_TEXT_PATH } from "../../src/shared/protocol";

import { valueAt } from "../support/markedData";
import { START_TIMEOUT_MS, startRealPayload } from "../support/realPayload";
import { postOfJson, restOf } from "../support/restRequests";
import { page } from "../support/richTextPages";
import { EDITOR, signIn } from "../support/unsavedRichTextRequests";

const NAME = "preview-grant-references";

const element = (type: string, children: object[], extra: object = {}) => ({
  children,
  direction: null,
  format: "",
  indent: 0,
  type,
  version: 1,
  ...extra,
});

const text = (value: string) => ({
  detail: 0,
  format: 0,
  mode: "normal",
  style: "",
  text: value,
  type: "text",
  version: 1,
});

const relationship = (relationTo: string, value: number | string) => ({
  format: "",
  relationTo,
  type: "relationship",
  value,
  version: 2,
});

const upload = (relationTo: string, value: number | string) => ({
  fields: null,
  format: "",
  relationTo,
  type: "upload",
  value,
  version: 3,
});

const linkTo = (relationTo: string, value: number | string) =>
  element("paragraph", [
    element("link", [text("a link")], {
      fields: { doc: { relationTo, value }, linkType: "internal", newTab: false },
    }),
  ]);

const stateOf = (...nodes: object[]) => ({
  root: element("root", [element("paragraph", [text("Hello")]), ...nodes]),
});

const file = (name: string) => ({
  data: Buffer.from(name),
  mimetype: "text/plain",
  name,
  size: name.length,
});

const NODE = "root.children.1";
const LINKED = `${NODE}.children.0.fields.doc.value`;

type Seeded = {
  ann: number | string;
  bob: number | string;
  editorId: number | string;
  linked: number | string;
  other: number | string;
  pageId: string;
  photo: number | string;
  preference: number | string;
  spare: number | string;
};

describe("the references the unsaved rich text endpoint resolves", () => {
  let payload: Payload;
  let rest: Rest;
  let editor: Headers;
  let seeded: Seeded;
  let grant: string;

  const fieldOf = () => ({ ...page(seeded.pageId), key: "body" });

  const ask = async (state?: object): Promise<unknown> => {
    const request = { field: fieldOf(), locale: "en", ...(state && { state }) };
    const response = await rest(VE_UNSAVED_RICH_TEXT_PATH, postOfJson({ grant, request }));
    const { value } = (await response.json()) as { value: unknown };
    return value;
  };

  beforeAll(async () => {
    payload = await startRealPayload({ name: NAME, plugin: { instantPreview: true } });
    rest = restOf(payload, NAME);
    editor = await signIn(payload, EDITOR);
    const editorUser = (await payload.auth({ headers: editor })).user!;
    const editorId = editorUser.id;
    const ann = await payload.create({ collection: "authors", data: { name: "Ann" } });
    const bob = await payload.create({ collection: "authors", data: { name: "Bob" } });
    const photo = await payload.create({
      collection: "media",
      data: { alt: "A harbour" },
      file: file("harbour.txt"),
    });
    const spare = await payload.create({
      collection: "media",
      data: { alt: "A spare" },
      file: file("spare.txt"),
    });
    const linked = await payload.create({
      collection: "pages",
      data: { title: "Linked" },
      draft: true,
    });
    const other = await payload.create({
      collection: "pages",
      data: { title: "Another draft" },
      draft: true,
    });
    const preference = await payload.create({
      collection: "payload-preferences",
      data: { key: "nav", user: { relationTo: "users", value: editorId }, value: { open: true } },
      user: editorUser,
    });
    const saved = await payload.create({
      collection: "pages",
      data: {
        body: stateOf(
          relationship("authors", ann.id),
          upload("media", photo.id),
          linkTo("pages", linked.id),
          relationship("users", editorId),
          relationship("payload-preferences", preference.id)
        ),
        title: "With references",
      },
      draft: true,
    });
    seeded = {
      ann: ann.id,
      bob: bob.id,
      editorId,
      linked: linked.id,
      other: other.id,
      pageId: String(saved.id),
      photo: photo.id,
      preference: preference.id,
      spare: spare.id,
    };
    const granted = await rest(VE_PREVIEW_GRANT_PATH, postOfJson(page(seeded.pageId), editor));
    ({ grant } = (await granted.json()) as { grant: string });
  }, START_TIMEOUT_MS);

  afterAll(() => payload.destroy());

  it("resolves the references the saved value of the field holds", async () => {
    const value = await ask(
      stateOf(
        relationship("authors", seeded.ann),
        upload("media", seeded.photo),
        linkTo("pages", seeded.linked)
      )
    );

    expect(valueAt(value, `${NODE}.value.name`)).toContain("Ann");
    expect(valueAt(value, "root.children.2.value.alt")).toContain("A harbour");
    expect(valueAt(value, "root.children.3.children.0.fields.doc.value.title")).toContain("Linked");
  });

  it.each([
    ["a document of the same collection the saved value does not hold", "authors", "bob"],
    ["a user", "users", "editorId"],
    ["a document of a collection of Payload itself", "payload-preferences", "preference"],
    ["another draft", "pages", "other"],
  ] as const)("leaves a relationship to %s as its id", async (_name, relationTo, id) => {
    const value = await ask(stateOf(relationship(relationTo, seeded[id])));

    expect(valueAt(value, `${NODE}.value`)).toBe(seeded[id]);
  });

  it.each([
    ["a user", "users", "editorId"],
    ["a document of a collection of Payload itself", "payload-preferences", "preference"],
    ["another draft", "pages", "other"],
  ] as const)("leaves a link to %s as its id", async (_name, relationTo, id) => {
    const value = await ask(stateOf(linkTo(relationTo, seeded[id])));

    expect(valueAt(value, LINKED)).toBe(seeded[id]);
    expect(valueAt(value, `${NODE}.children.0.fields.linkType`)).toBe("internal");
  });

  it("leaves an upload the saved value does not hold as its id", async () => {
    const value = await ask(stateOf(upload("media", seeded.spare)));

    expect(valueAt(value, `${NODE}.value`)).toBe(seeded.spare);
  });

  it("never resolves a user or a document of Payload itself, also when the saved value holds it", async () => {
    const posted = await ask(
      stateOf(
        relationship("users", seeded.editorId),
        relationship("payload-preferences", seeded.preference)
      )
    );
    const saved = await ask();

    expect(valueAt(posted, `${NODE}.value`)).toBe(seeded.editorId);
    expect(valueAt(posted, "root.children.2.value")).toBe(seeded.preference);
    expect(valueAt(saved, "root.children.4.value")).toBe(seeded.editorId);
    expect(valueAt(saved, "root.children.5.value")).toBe(seeded.preference);
    expect(valueAt(saved, `${NODE}.value.name`)).toContain("Ann");
  });

  it("leaves nothing of the held reference in the answer but its id", async () => {
    const value = await ask(stateOf(relationship("authors", seeded.bob)));

    expect(new Set(Object.keys(valueAt(value, NODE) as object))).toEqual(
      new Set(Object.keys(relationship("authors", seeded.bob)))
    );
  });

  it("resolves a reference the editor added for readUnsavedRichText, which a Server Action of the site calls", async () => {
    const value = await readUnsavedRichText({
      headers: editor,
      payload,
      request: {
        field: fieldOf(),
        locale: "en",
        state: stateOf(relationship("authors", seeded.bob)),
      },
    });

    expect(valueAt(value, `${NODE}.value.name`)).toContain("Bob");
  });
});
