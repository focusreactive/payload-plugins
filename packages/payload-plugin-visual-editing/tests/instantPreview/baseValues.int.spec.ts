import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { BaseValues } from "../../src/client/instantPreview/unsavedRender/baseValues";
import type { ValueSource } from "../../src/client/instantPreview/unsavedRender/valueSource";

import { createBaseValues } from "../../src/client/instantPreview/unsavedRender/baseValues";
import { rootOf } from "../../src/shared/richText/editorNodes";
import { richTextNodeKeyOf } from "../../src/shared/richText/nodeKey";
import { VE_DOCUMENT_SAVED_TYPE, VE_FIELD_PATCH_TYPE } from "../../src/shared/protocol";

import { editorState, paragraph, textNode } from "../support/editorState";
import {
  ADMIN_ORIGIN,
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
} from "../support/previewWindow";
import { flushMutations } from "../support/time";

const PAGE = { collectionSlug: "pages", docId: "1", kind: "collection" } as const;
const OTHER_PAGE = { ...PAGE, docId: "2" };
const BODY = { ...PAGE, key: "body" };
const INTRO = { ...PAGE, key: "intro" };
const SAVED = editorState(paragraph(textNode("Saved")));
const ANSWERED = editorState(paragraph(textNode("Answered")));
const WITHOUT_REFERENCES = editorState(paragraph(textNode("Typed")));
const WITH_A_BLOCK = editorState(paragraph(textNode("Typed")), {
  fields: { blockType: "cta", id: "b1" },
  type: "block",
  version: 2,
});

const typedInto = (fieldKey: string, document: object = PAGE, locale = "en") => ({
  ...document,
  locale,
  patches: [{ key: richTextNodeKeyOf({ address: "0.0", fieldKey, shape: "s" }), value: "Typed" }],
  type: VE_FIELD_PATCH_TYPE,
});

const saveDocument = () => postFromAdmin({ type: VE_DOCUMENT_SAVED_TYPE });

describe("the base values of the live rich texts of a page", () => {
  let bases: BaseValues;
  let canAsk: boolean;
  let source: ValueSource & { value: ReturnType<typeof vi.fn> };

  const askedFields = () => source.value.mock.calls.map(([request]) => request);

  beforeEach(() => {
    stubAdminWindow({ postMessage: vi.fn() });
    canAsk = true;
    source = {
      canAsk: () => canAsk,
      html: vi.fn(async () => null),
      value: vi.fn(async () => SAVED),
    };
    bases = createBaseValues(() => ADMIN_ORIGIN, source);
  });

  afterEach(() => {
    bases.stop();
    restorePreviewWindow();
  });

  describe("of a field with references", () => {
    it("asks once for the saved value when the editor types in the field", async () => {
      bases.watch(BODY, true, vi.fn());

      postFromAdmin(typedInto("body"));
      postFromAdmin(typedInto("body"));
      await flushMutations();

      expect(askedFields()).toEqual([{ field: BODY, locale: "en" }]);
      expect(bases.baseOf(BODY, "en", WITH_A_BLOCK)).toEqual({ base: SAVED });
    });

    it("asks nothing while the editor types in another field or another document", async () => {
      bases.watch(BODY, true, vi.fn());
      bases.watch(INTRO, true, vi.fn());

      postFromAdmin(typedInto("intro"));
      postFromAdmin(typedInto("body", OTHER_PAGE));
      await flushMutations();

      expect(askedFields()).toEqual([{ field: INTRO, locale: "en" }]);
    });

    it("asks for the saved value the first time a structure with references needs it", async () => {
      bases.watch(BODY, true, vi.fn());

      expect(bases.baseOf(BODY, "en", WITH_A_BLOCK)).toBeNull();
      expect(bases.baseOf(BODY, "en", WITH_A_BLOCK)).toBeNull();
      await flushMutations();

      expect(askedFields()).toEqual([{ field: BODY, locale: "en" }]);
      expect(bases.baseOf(BODY, "en", WITH_A_BLOCK)).toEqual({ base: SAVED });
    });

    it("needs no base for a structure without references", async () => {
      bases.watch(BODY, true, vi.fn());

      expect(bases.baseOf(BODY, "en", WITHOUT_REFERENCES)).toEqual({ base: null });
      await flushMutations();

      expect(source.value).not.toHaveBeenCalled();
    });

    it("tells its watchers when the saved value arrives", async () => {
      const onBase = vi.fn();
      bases.watch(BODY, true, onBase);

      bases.baseOf(BODY, "en", WITH_A_BLOCK);
      await flushMutations();

      expect(onBase).toHaveBeenCalledTimes(1);
    });

    it("asks again when the saved value did not arrive", async () => {
      source.value.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error("offline"));
      const onBase = vi.fn();
      bases.watch(BODY, true, onBase);

      bases.baseOf(BODY, "en", WITH_A_BLOCK);
      await flushMutations();
      bases.baseOf(BODY, "en", WITH_A_BLOCK);
      await flushMutations();
      postFromAdmin(typedInto("body"));
      await flushMutations();

      expect(askedFields()).toHaveLength(3);
      expect(onBase).toHaveBeenCalledTimes(1);
      expect(bases.baseOf(BODY, "en", WITH_A_BLOCK)).toEqual({ base: SAVED });
    });

    it("has no base in another locale than the one it was read in", async () => {
      bases.watch(BODY, true, vi.fn());
      postFromAdmin(typedInto("body"));
      await flushMutations();

      expect(bases.baseOf(BODY, "de", WITH_A_BLOCK)).toBeNull();
    });

    it("adds what the server answered for a structure to the saved value", async () => {
      bases.watch(BODY, true, vi.fn());
      postFromAdmin(typedInto("body"));
      await flushMutations();

      bases.answerFor(BODY, "en")(ANSWERED);

      expect(bases.baseOf(BODY, "en", WITH_A_BLOCK)).toEqual({
        base: { root: { children: [rootOf(SAVED), rootOf(ANSWERED)], type: "root" } },
      });
    });

    it("takes an answer as the base before the saved value arrives", () => {
      bases.watch(BODY, true, vi.fn());

      bases.answerFor(BODY, "en")(ANSWERED);

      expect(bases.baseOf(BODY, "en", WITH_A_BLOCK)).toEqual({ base: ANSWERED });
    });
  });

  it("keeps what the server answered for a field without references as its base", () => {
    bases.watch(BODY, false, vi.fn());

    bases.answerFor(BODY, "en")(ANSWERED);

    expect(bases.baseOf(BODY, "en", WITH_A_BLOCK)).toEqual({ base: ANSWERED });
  });

  it("asks nothing for a field without references, which needs no base", async () => {
    bases.watch(BODY, false, vi.fn());

    postFromAdmin(typedInto("body"));
    await flushMutations();

    expect(bases.baseOf(BODY, "en", WITH_A_BLOCK)).toEqual({ base: null });
    expect(source.value).not.toHaveBeenCalled();
  });

  it("asks nothing for a message from elsewhere or without a grant", async () => {
    bases.watch(BODY, true, vi.fn());

    postFromAdmin(typedInto("body"), { origin: "https://elsewhere.example" });
    canAsk = false;
    postFromAdmin(typedInto("body"));
    bases.baseOf(BODY, "en", WITH_A_BLOCK);
    await flushMutations();

    expect(source.value).not.toHaveBeenCalled();
  });

  describe("after the document is saved", () => {
    beforeEach(async () => {
      bases.watch(BODY, true, vi.fn());
      bases.watch(INTRO, false, vi.fn());
      postFromAdmin(typedInto("body"));
      await flushMutations();
      source.value.mockClear();
      saveDocument();
    });

    it("forgets the base of a field with references and asks again when the editor types in it", async () => {
      expect(bases.baseOf(BODY, "en", WITH_A_BLOCK)).toBeNull();

      postFromAdmin(typedInto("body"));
      await flushMutations();

      expect(askedFields()).toEqual([{ field: BODY, locale: "en" }]);
    });

    it("renders a structure without references of any field with no base and asks nothing", async () => {
      postFromAdmin(typedInto("intro"));
      await flushMutations();

      expect(bases.baseOf(INTRO, "en", WITHOUT_REFERENCES)).toEqual({ base: null });
      expect(bases.baseOf(BODY, "en", WITHOUT_REFERENCES)).toEqual({ base: null });
      expect(source.value).not.toHaveBeenCalled();
    });

    it("asks for the base of a field that had no references once its structure has some", async () => {
      expect(bases.baseOf(INTRO, "en", WITH_A_BLOCK)).toBeNull();
      await flushMutations();

      expect(askedFields()).toEqual([{ field: INTRO, locale: "en" }]);
      expect(bases.baseOf(INTRO, "en", WITH_A_BLOCK)).toEqual({ base: SAVED });
    });

    it("drops an answer to a call that started before the save", () => {
      const answered = bases.answerFor(BODY, "en");
      saveDocument();

      answered(ANSWERED);

      expect(bases.baseOf(BODY, "en", WITH_A_BLOCK)).toBeNull();
    });
  });

  it("drops a saved value that arrives after a save and asks again", async () => {
    const arrival: { resolve: (value: unknown) => void } = { resolve: () => undefined };
    source.value.mockReturnValueOnce(
      new Promise((resolve) => {
        arrival.resolve = resolve;
      })
    );
    bases.watch(BODY, true, vi.fn());
    postFromAdmin(typedInto("body"));
    saveDocument();

    arrival.resolve(ANSWERED);
    await flushMutations();

    expect(bases.baseOf(BODY, "en", WITH_A_BLOCK)).toBeNull();
    await flushMutations();
    expect(bases.baseOf(BODY, "en", WITH_A_BLOCK)).toEqual({ base: SAVED });
  });

  it("forgets a field nothing watches any more", () => {
    const stopWatching = bases.watch(BODY, true, vi.fn());
    bases.answerFor(BODY, "en")(ANSWERED);

    stopWatching();

    expect(bases.baseOf(BODY, "en", WITH_A_BLOCK)).toBeNull();
  });
});
