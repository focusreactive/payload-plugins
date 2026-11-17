import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LiveRichTextIdentity } from "../../src/client/instantPreview/liveRichTextOf";
import type {
  RenderSources,
  RenderSourcesOptions,
} from "../../src/client/instantPreview/unsavedRender/renderSources";

import { liveRichTextOf } from "../../src/client/instantPreview/liveRichTextOf";
import {
  listenToRenderSources,
  RENDER_SOURCES_OF_THE_PAGE_ALONE,
} from "../../src/client/instantPreview/unsavedRender/renderSources";
import { VE_DOCUMENT_SAVED_TYPE, VE_PREVIEW_GRANT_TYPE } from "../../src/shared/protocol";
import { withoutBlockFields } from "../../src/shared/richText/blockNodes";
import { childrenOf, rootOf } from "../../src/shared/richText/editorNodes";
import { markTextLeaves } from "../../src/shared/richText/markTextLeaves";
import { META_KEY } from "../../src/shared/shared";
import { stripMarkers } from "../../src/stripMarkers";
import { keyedFieldAddressOf } from "../../src/shared/veDocument";

import { editorState, paragraph, textNode } from "../support/editorState";
import {
  ADMIN_ORIGIN,
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
} from "../support/previewWindow";
import { flushMutations } from "../support/time";

const PAYLOAD_API = "https://cms.example/api";
const PAGE = { collectionSlug: "pages", docId: "1", kind: "collection" } as const;
const BODY = { ...PAGE, key: "body" };
const META = { ...PAGE, path: "body", terminal: true };
const SAVED_CALLOUT = { blockType: "callout", id: "callout-saved", text: "Saved callout" };
const NOT_ABORTED = new AbortController().signal;

type Asked = { format: string; grant: string; request: { state?: unknown } };

const callout = (fields: object) => ({ fields, format: "", type: "block", version: 2 });

const draftReadOf = (state: object) => {
  const value = structuredClone(state);
  markTextLeaves(value, keyedFieldAddressOf(BODY));
  return { ...value, [META_KEY]: META };
};

const textsOf = (value: unknown): string[] =>
  childrenOf(rootOf(value) ?? {}).map((node) =>
    node.type === "block"
      ? ((node.fields as { text?: string }).text ?? "a block without fields")
      : stripMarkers(
          childrenOf(node)
            .map((leaf) => String(leaf.text ?? ""))
            .join("")
        )
  );

const identityOf = (saved: object): LiveRichTextIdentity => {
  const identity = liveRichTextOf(saved);
  if (!identity) throw new Error("The saved value is no live rich text");
  return identity;
};

const WITHOUT_REFERENCES = draftReadOf(editorState(paragraph(textNode("Hello"))));
const WITH_A_BLOCK = draftReadOf(editorState(paragraph(textNode("Hello")), callout(SAVED_CALLOUT)));
const NEW_PARAGRAPH = editorState(paragraph(textNode("Hello")), paragraph(textNode("New")));
const NEW_PARAGRAPH_AFTER_THE_BLOCK = withoutBlockFields(
  editorState(paragraph(textNode("Hello")), callout(SAVED_CALLOUT), paragraph(textNode("New")))
);

describe("the sources a live rich text renders an unsaved structure from", () => {
  let sources: RenderSources;
  let asked: Asked[];
  let answerOf: (asked: Asked) => object;
  const render = vi.fn(async () => ["From the call of the site"]);
  const renderValue = vi.fn((value: unknown) => textsOf(value));

  const listen = (options: Partial<RenderSourcesOptions> = {}) => {
    sources = listenToRenderSources({
      adminOrigin: () => ADMIN_ORIGIN,
      payloadApi: PAYLOAD_API,
      ...options,
    });
  };

  const giveGrant = () =>
    postFromAdmin({ expiresAt: Date.now() + 60_000, grant: "signed", type: VE_PREVIEW_GRANT_TYPE });

  const requestOf = (state: object) => ({ field: BODY, locale: "en", state });

  const renderedOnThePage = (saved: object, state: object, onBase = vi.fn()) =>
    sources.onThePage(identityOf(saved), { renderValue }, onBase)?.optimistic(requestOf(state)) ??
    null;

  beforeEach(() => {
    asked = [];
    answerOf = () => ({ value: draftReadOf(editorState(paragraph(textNode("From Payload")))) });
    render.mockClear();
    renderValue.mockClear();
    sources = RENDER_SOURCES_OF_THE_PAGE_ALONE;
    stubAdminWindow({ postMessage: vi.fn() });
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      const sent = JSON.parse(init.body as string) as Asked;
      asked.push(sent);
      return Response.json(answerOf(sent));
    });
  });

  afterEach(() => {
    sources.stop();
    vi.unstubAllGlobals();
    restorePreviewWindow();
  });

  describe("on the page", () => {
    it("renders a structure of a field without references with no API of Payload", () => {
      listen({ payloadApi: undefined });

      expect(renderedOnThePage(WITHOUT_REFERENCES, NEW_PARAGRAPH)).toEqual(["Hello", "New"]);
      expect(asked).toEqual([]);
    });

    it("renders a field with references only once Payload gave its saved value", async () => {
      answerOf = () => ({ value: WITH_A_BLOCK });
      const onBase = vi.fn();
      listen();
      giveGrant();
      const onThePage = sources.onThePage(identityOf(WITH_A_BLOCK), { renderValue }, onBase);

      expect(onThePage?.optimistic(requestOf(NEW_PARAGRAPH_AFTER_THE_BLOCK))).toBeNull();
      await flushMutations();

      expect(onBase).toHaveBeenCalledTimes(1);
      expect(asked.map(({ request }) => request.state)).toEqual([undefined]);
      expect(onThePage?.optimistic(requestOf(NEW_PARAGRAPH_AFTER_THE_BLOCK))).toEqual([
        "Hello",
        "Saved callout",
        "New",
      ]);
    });

    it("renders no field with references without the API of Payload, which gives its saved value", () => {
      listen({ payloadApi: undefined });

      expect(renderedOnThePage(WITH_A_BLOCK, NEW_PARAGRAPH_AFTER_THE_BLOCK)).toBeNull();
    });

    it("forgets the saved value of a field when the document is saved", async () => {
      answerOf = () => ({ value: WITH_A_BLOCK });
      listen();
      giveGrant();
      const onThePage = sources.onThePage(identityOf(WITH_A_BLOCK), { renderValue }, vi.fn());
      onThePage?.optimistic(requestOf(NEW_PARAGRAPH_AFTER_THE_BLOCK));
      await flushMutations();

      postFromAdmin({ type: VE_DOCUMENT_SAVED_TYPE });

      expect(onThePage?.optimistic(requestOf(NEW_PARAGRAPH_AFTER_THE_BLOCK))).toBeNull();
    });

    it("renders nothing without a renderer of the value", () => {
      listen();

      expect(sources.onThePage(identityOf(WITHOUT_REFERENCES), { render }, vi.fn())).toBeNull();
    });

    it("renders nothing when told not to render on the page", () => {
      listen({ rendersOnThePage: false });

      expect(renderedOnThePage(WITHOUT_REFERENCES, NEW_PARAGRAPH)).toBeNull();
    });

    it("renders nothing for an identity an older version printed, without meta and references", () => {
      listen();
      const { field, shape } = identityOf(WITHOUT_REFERENCES);

      expect(sources.onThePage({ field, shape }, { renderValue }, vi.fn())).toBeNull();
    });

    it("stops watching for the saved value of a field it no longer renders", async () => {
      answerOf = () => ({ value: WITH_A_BLOCK });
      const onBase = vi.fn();
      listen();
      giveGrant();
      const onThePage = sources.onThePage(identityOf(WITH_A_BLOCK), { renderValue }, onBase);
      onThePage?.optimistic(requestOf(NEW_PARAGRAPH_AFTER_THE_BLOCK));

      onThePage?.stop();
      await flushMutations();

      expect(onBase).not.toHaveBeenCalled();
    });
  });

  describe("for the check with the server", () => {
    it("asks Payload with the grant and renders its answer with the renderer of the value", async () => {
      listen();
      giveGrant();

      const node = await sources.render(
        { render, renderValue },
        requestOf(NEW_PARAGRAPH),
        NOT_ABORTED
      );

      expect(node).toEqual(["From Payload"]);
      expect(asked).toEqual([
        { format: "json", grant: "signed", request: requestOf(NEW_PARAGRAPH) },
      ]);
      expect(render).not.toHaveBeenCalled();
    });

    it("calls the site while it holds no grant", async () => {
      listen();

      const node = await sources.render(
        { render, renderValue },
        requestOf(NEW_PARAGRAPH),
        NOT_ABORTED
      );

      expect(node).toEqual(["From the call of the site"]);
      expect(asked).toEqual([]);
    });

    it("calls the site without a renderer of the value, also with a grant", async () => {
      listen();
      giveGrant();

      const node = await sources.render({ render }, requestOf(NEW_PARAGRAPH), NOT_ABORTED);

      expect(node).toEqual(["From the call of the site"]);
      expect(render).toHaveBeenCalledWith(requestOf(NEW_PARAGRAPH), NOT_ABORTED);
      expect(asked).toEqual([]);
    });

    it("calls the site without the API of Payload", async () => {
      listen({ payloadApi: "" });
      giveGrant();

      const node = await sources.render(
        { render, renderValue },
        requestOf(NEW_PARAGRAPH),
        NOT_ABORTED
      );

      expect(node).toEqual(["From the call of the site"]);
    });

    it("answers nothing when Payload answers nothing", async () => {
      answerOf = () => ({ value: null });
      listen();
      giveGrant();

      const node = await sources.render({ renderValue }, requestOf(NEW_PARAGRAPH), NOT_ABORTED);

      expect(node).toBeNull();
      expect(renderValue).not.toHaveBeenCalled();
    });

    it("answers nothing with no call of the site and no grant", async () => {
      listen();

      expect(
        await sources.render({ renderValue }, requestOf(NEW_PARAGRAPH), NOT_ABORTED)
      ).toBeNull();
    });

    it("adds the answer of Payload to what a field with references renders on the page with", async () => {
      answerOf = ({ request }) => ({
        value: request.state === undefined ? null : WITH_A_BLOCK,
      });
      listen();
      giveGrant();
      const onThePage = sources.onThePage(identityOf(WITH_A_BLOCK), { renderValue }, vi.fn());

      await sources.render({ renderValue }, requestOf(NEW_PARAGRAPH_AFTER_THE_BLOCK), NOT_ABORTED);

      expect(onThePage?.optimistic(requestOf(NEW_PARAGRAPH_AFTER_THE_BLOCK))).toEqual([
        "Hello",
        "Saved callout",
        "New",
      ]);
    });
  });

  describe("as the HTML Payload renders", () => {
    it("asks Payload for the HTML with the grant", async () => {
      answerOf = () => ({ html: "<p>From Payload</p>" });
      listen();
      giveGrant();

      const html = await sources.htmlOfPayload?.(requestOf(NEW_PARAGRAPH), NOT_ABORTED);

      expect(html).toBe("<p>From Payload</p>");
      expect(asked.map(({ format }) => format)).toEqual(["html"]);
    });

    it("is not there without the API of Payload", () => {
      listen({ payloadApi: undefined });

      expect(sources.htmlOfPayload).toBeNull();
    });
  });

  describe("asked whether a field can show an unsaved structure at all", () => {
    it("can with a call of the site", () => {
      listen({ payloadApi: undefined, rendersOnThePage: false });

      expect(sources.canShow({ render })).toBe(true);
    });

    it("can with a renderer of the value that renders on the page", () => {
      listen({ payloadApi: undefined });

      expect(sources.canShow({ renderValue })).toBe(true);
    });

    it("can with a renderer of the value and the API of Payload when told not to render on the page", () => {
      listen({ rendersOnThePage: false });

      expect(sources.canShow({ renderValue })).toBe(true);
    });

    it("cannot with a renderer of the value alone when told not to render on the page", () => {
      listen({ payloadApi: undefined, rendersOnThePage: false });

      expect(sources.canShow({ renderValue })).toBe(false);
    });

    it("cannot without any renderer", () => {
      listen();

      expect(sources.canShow({})).toBe(false);
    });
  });

  it("asks nobody and listens to nothing before a page names the API of Payload", () => {
    const postToAdmin = vi.fn();
    stubAdminWindow({ postMessage: postToAdmin });

    expect(renderedOnThePage(WITHOUT_REFERENCES, NEW_PARAGRAPH)).toEqual(["Hello", "New"]);
    expect(postToAdmin).not.toHaveBeenCalled();
  });
});
