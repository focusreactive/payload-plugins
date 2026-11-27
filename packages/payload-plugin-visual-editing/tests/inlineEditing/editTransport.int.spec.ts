import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminEditChannel } from "../../src/client/inlineEditing/adminEditChannel";
import type { EditRoutes } from "../../src/client/inlineEditing/editRoutes";
import type {
  EditTransport,
  FieldEdit,
  ShownImage,
} from "../../src/client/inlineEditing/editTransport";
import type { VeEditedField, VeEditorState } from "../../src/shared/protocol";

import {
  createAdminEditChannel,
  MEDIA_PICK_TIME_LIMIT_MS,
} from "../../src/client/inlineEditing/adminEditChannel";
import { createEditRoutes } from "../../src/client/inlineEditing/editRoutes";
import {
  createEditTransport,
  EDIT_SAVE_PAUSE_MS,
  EDIT_SEND_PAUSE_MS,
  KEEPALIVE_BODY_LIMIT,
} from "../../src/client/inlineEditing/editTransport";
import {
  VE_DOCUMENT_SAVED_TYPE,
  VE_FIELD_EDIT_REFUSED_TYPE,
  VE_FIELD_EDIT_TYPE,
  VE_MEDIA_PICK_CANCELLED_TYPE,
  VE_MEDIA_PICKED_TYPE,
  VE_PICK_MEDIA_TYPE,
  VE_RICH_TEXT_EDIT_ENDED_TYPE,
  VE_RICH_TEXT_EDIT_TYPE,
} from "../../src/shared/protocol";

import { editorState, paragraph, textNode } from "../support/editorState";

import {
  ADMIN_ORIGIN,
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
  stubOpenerWindow,
} from "../support/previewWindow";

const PAYLOAD_API = "https://cms.example.com/api";

const TITLE = { collectionSlug: "page", docId: "1", key: "title", kind: "collection" } as const;

const LEAD = { ...TITLE, key: "lead" };

const BODY = { ...TITLE, key: "body" };

const IMAGE = { ...TITLE, key: "image" };

const STATE = editorState(paragraph(textNode("Hello")));

const CHANGED_STATE = editorState(paragraph(textNode("Hello world")));

const LIGHTHOUSE = {
  filename: "lighthouse.jpg",
  id: 9,
  thumbnailUrl: "/media/lighthouse-thumb.jpg",
  url: "/media/lighthouse.jpg",
};

const onEdited = vi.fn();

const ctx = { adminOrigin: ADMIN_ORIGIN, onEdited, payloadApi: PAYLOAD_API };

const answerOf = (saved: boolean, ok = true) =>
  ({ json: () => Promise.resolve({ saved }), ok }) as Response;

const storedAnswerOf = (value: unknown) =>
  ({ json: () => Promise.resolve({ saved: true, value }), ok: true }) as Response;

const withoutAutosave = () =>
  ({ json: () => Promise.resolve({ autosave: false, saved: true }), ok: true }) as Response;

const refusalOf = (reason: unknown) =>
  ({ json: () => Promise.resolve({ reason, saved: false }), ok: false }) as Response;

type PageImage = ShownImage & {
  show: ReturnType<typeof vi.fn>;
  openField: ReturnType<typeof vi.fn>;
  putBack: ReturnType<typeof vi.fn>;
};

const pageImage = (shownMediaId: string | null = null): PageImage => {
  const putBack = vi.fn();
  return { openField: vi.fn(), putBack, show: vi.fn(() => putBack), shownMediaId };
};

describe("the transport of an edit", () => {
  let transport: EditTransport;
  let routes: EditRoutes;
  let channel: AdminEditChannel;
  let holdsAnyForm: boolean;
  let statuses: string[];
  let refusals: (string | undefined)[];
  let fetchEndpoint: ReturnType<typeof vi.fn>;

  const start = () => {
    routes = createEditRoutes({ holdsAnyForm: () => holdsAnyForm, win: window });
    channel = createAdminEditChannel(window, () => ctx.adminOrigin);
    transport = createEditTransport(
      () => ctx,
      (status, refusal) => {
        statuses.push(status);
        refusals.push(refusal);
      },
      window,
      routes,
      channel
    );
  };

  const beginEdit = (field: VeEditedField, startedFrom: string) =>
    transport.beginEdit(field, startedFrom);

  const beginRichTextEdit = (field: VeEditedField, startedFrom: VeEditorState) =>
    transport.beginEdit(field, startedFrom);

  const save = (field: VeEditedField, startedFrom: string, value: string) => {
    const edit = beginEdit(field, startedFrom);
    edit.change(value);
    edit.end();
  };

  const saveRichText = (field: VeEditedField, startedFrom: VeEditorState, value: VeEditorState) => {
    const edit = beginRichTextEdit(field, startedFrom);
    edit.change(value);
    edit.end();
    return edit;
  };

  const settle = () => vi.advanceTimersByTimeAsync(0);

  const sentBodies = () =>
    fetchEndpoint.mock.calls.map(
      ([, init]) => JSON.parse((init as RequestInit).body as string) as Record<string, unknown>
    );

  beforeEach(() => {
    vi.useFakeTimers();
    holdsAnyForm = false;
    statuses = [];
    refusals = [];
    onEdited.mockClear();
    fetchEndpoint = vi.fn(() => Promise.resolve(answerOf(true)));
    vi.stubGlobal("fetch", fetchEndpoint);
  });

  afterEach(() => {
    transport.dispose();
    channel.dispose();
    restorePreviewWindow();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe("of a page next to the admin", () => {
    const postToAdmin = vi.fn();

    const posted = () => postToAdmin.mock.calls.map(([message]) => message as unknown);

    const picks = () =>
      posted().filter((message) => (message as { type: string }).type === VE_PICK_MEDIA_TYPE);

    const savedInTheAdmin = (document: unknown) =>
      postFromAdmin({ ...(document as object), type: VE_DOCUMENT_SAVED_TYPE });

    const refusedByTheForm = (field: VeEditedField, reason?: string) =>
      postFromAdmin({ ...field, ...(reason && { reason }), type: VE_FIELD_EDIT_REFUSED_TYPE });

    beforeEach(() => {
      postToAdmin.mockClear();
      stubAdminWindow({ postMessage: postToAdmin });
      start();
    });

    it("posts the latest value to the admin once the editor pauses, without the base its form has no use for", () => {
      const edit = beginEdit(TITLE, "Shown");
      edit.change("H");
      edit.change("Hello");
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS - 1);
      expect(postToAdmin).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);

      expect(posted()).toEqual([{ ...TITLE, type: VE_FIELD_EDIT_TYPE, value: "Hello" }]);
      expect(postToAdmin).toHaveBeenCalledWith(expect.anything(), ADMIN_ORIGIN);
      expect(fetchEndpoint).not.toHaveBeenCalled();
    });

    it("posts an edited rich text state as a message of its own", () => {
      beginRichTextEdit(BODY, STATE).change(CHANGED_STATE);
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

      expect(posted()).toEqual([{ ...BODY, state: CHANGED_STATE, type: VE_RICH_TEXT_EDIT_TYPE }]);
      expect(onEdited).not.toHaveBeenCalled();
    });

    it("posts a rich text state it would hold on a page of its own, as the form keeps every node", () => {
      const edit = beginRichTextEdit(BODY, STATE);

      edit.hold(CHANGED_STATE);
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

      expect(edit.goesToTheAdmin()).toBe(true);
      expect(posted()).toEqual([{ ...BODY, state: CHANGED_STATE, type: VE_RICH_TEXT_EDIT_TYPE }]);
    });

    it("keeps the edits of two fields apart", () => {
      beginEdit(TITLE, "").change("Title");
      beginEdit(LEAD, "").change("Lead");

      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

      expect(posted().map((message) => (message as { key: string }).key)).toEqual([
        "title",
        "lead",
      ]);
    });

    it("posts at once when the edit ends", () => {
      const edit = beginEdit(TITLE, "Shown");
      edit.change("Hello");

      edit.end();

      expect(postToAdmin).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);
      expect(postToAdmin).toHaveBeenCalledTimes(1);
    });

    it("tells the admin a rich text edit ended after its last state", () => {
      const edit = beginRichTextEdit(BODY, STATE);
      edit.change(CHANGED_STATE);

      edit.end();

      expect(posted()).toEqual([
        { ...BODY, state: CHANGED_STATE, type: VE_RICH_TEXT_EDIT_TYPE },
        { ...BODY, type: VE_RICH_TEXT_EDIT_ENDED_TYPE },
      ]);
    });

    it("tells the admin of no end of a text edit", () => {
      save(TITLE, "Shown", "Hello");

      expect(posted()).toEqual([{ ...TITLE, type: VE_FIELD_EDIT_TYPE, value: "Hello" }]);
    });

    describe("a cancelled edit", () => {
      it("of text posts nothing when none of its values was posted", () => {
        const edit = beginEdit(TITLE, "Shown");
        edit.change("Hello");

        edit.cancel();
        vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

        expect(postToAdmin).not.toHaveBeenCalled();
        expect(statuses).toEqual(["unsaved", "saved"]);
      });

      it("of text posts the value it began with once one of its values was posted", () => {
        const edit = beginEdit(TITLE, "Shown");
        edit.change("Hello");
        vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

        edit.cancel();

        expect(posted().at(-1)).toEqual({ ...TITLE, type: VE_FIELD_EDIT_TYPE, value: "Shown" });
      });

      it("of rich text posts the state it began with, and then that it ended, though no state was posted", () => {
        const edit = beginRichTextEdit(BODY, STATE);
        edit.change(CHANGED_STATE);

        edit.cancel();

        expect(posted()).toEqual([
          { ...BODY, state: STATE, type: VE_RICH_TEXT_EDIT_TYPE },
          { ...BODY, type: VE_RICH_TEXT_EDIT_ENDED_TYPE },
        ]);
      });

      it("of rich text that changed nothing posts only that it ended", () => {
        beginRichTextEdit(BODY, STATE).cancel();

        expect(posted()).toEqual([{ ...BODY, type: VE_RICH_TEXT_EDIT_ENDED_TYPE }]);
      });
    });

    it("says an edit the form refused is not saved, and posts it again when asked", () => {
      beginEdit(TITLE, "Shown").change("Hello");
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

      refusedByTheForm(TITLE);
      transport.retry();

      expect(statuses).toEqual(["unsaved", "in-form", "failed", "in-form"]);
      expect(postToAdmin).toHaveBeenCalledTimes(2);
    });

    it("gives a refusal of the form the reason the form gave", () => {
      beginEdit(TITLE, "Shown").change("Hello");
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

      refusedByTheForm(TITLE, "not-editable");

      expect(refusals.at(-1)).toBe("not-editable");
    });

    it("keeps saying an edit the form refused is not saved when the admin saved the document", () => {
      beginEdit(TITLE, "").change("Title");
      beginEdit(LEAD, "").change("Lead");
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);
      refusedByTheForm(TITLE);

      savedInTheAdmin(TITLE);

      expect(statuses.at(-1)).toBe("failed");
    });

    it("says nothing about a save of the admin while the form holds no edit of the page", () => {
      savedInTheAdmin(TITLE);

      expect(statuses).toEqual([]);
    });

    it("says the edits are saved when the admin saved the document", () => {
      beginEdit(TITLE, "Shown").change("Hello");
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

      savedInTheAdmin({ ...TITLE, locale: "en" });

      expect(statuses).toEqual(["unsaved", "in-form", "saved"]);
    });

    it("stays unsaved when the admin saved another document", () => {
      beginEdit(TITLE, "Shown").change("Hello");
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

      savedInTheAdmin({ ...TITLE, docId: "2" });

      expect(statuses).toEqual(["unsaved", "in-form"]);
    });

    it("keeps saying changes are unsaved after a save of the admin while the editor still types", () => {
      const edit = beginEdit(TITLE, "Shown");
      edit.change("Hello");
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);
      edit.change("Hello world");

      savedInTheAdmin({});

      expect(statuses.at(-1)).toBe("unsaved");
    });

    it("counts a save that names no document as a save of every edit", () => {
      beginEdit(TITLE, "Shown").change("Hello");
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

      savedInTheAdmin({});

      expect(statuses).toEqual(["unsaved", "in-form", "saved"]);
    });

    it("ignores a refusal of an edit it did not post", () => {
      refusedByTheForm(TITLE);

      expect(statuses).toEqual([]);
    });

    it("counts an edit the form holds as unsaved until the admin saved its document", () => {
      const edit = beginEdit(TITLE, "Shown");
      edit.change("Hello");
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);
      expect(edit.isUnsaved()).toBe(true);

      savedInTheAdmin(TITLE);

      expect(edit.isUnsaved()).toBe(false);
    });

    it("says the value is unsaved while it waits, and in the form once the form holds it", () => {
      beginEdit(TITLE, "Shown").change("Hello");
      expect(statuses).toEqual(["unsaved"]);

      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

      expect(statuses).toEqual(["unsaved", "in-form"]);
    });

    describe("an image", () => {
      it("is picked in the drawer of the admin that frames the page", () => {
        const image = pageImage();

        expect(transport.beginImageEdit(IMAGE, image).pickInTheDrawer()).toBe(true);

        expect(posted()).toEqual([{ ...IMAGE, type: VE_PICK_MEDIA_TYPE }]);
        expect(statuses).toEqual([]);
      });

      it("picked in the drawer is shown and counted unsaved until the admin saved its document", () => {
        const image = pageImage();
        transport.beginImageEdit(IMAGE, image).pickInTheDrawer();

        postFromAdmin({ ...IMAGE, type: VE_MEDIA_PICKED_TYPE, url: LIGHTHOUSE.url, width: 640 });

        expect(image.show).toHaveBeenCalledWith({ url: LIGHTHOUSE.url, width: 640 });
        expect(statuses).toEqual(["in-form"]);

        savedInTheAdmin(TITLE);

        expect(statuses).toEqual(["in-form", "saved"]);
      });

      it("refused by the drawer opens the field and holds no failure", () => {
        const image = pageImage();
        transport.beginImageEdit(IMAGE, image).pickInTheDrawer();

        refusedByTheForm(IMAGE, "not-editable");
        transport.retry();

        expect(image.openField).toHaveBeenCalledTimes(1);
        expect(statuses).toEqual([]);
        expect(picks()).toHaveLength(1);
      });

      it("is asked of the drawer once per field while its pick is open", () => {
        transport.beginImageEdit(IMAGE, pageImage()).pickInTheDrawer();

        transport.beginImageEdit(IMAGE, pageImage()).pickInTheDrawer();

        expect(picks()).toHaveLength(1);
      });

      it("is asked of the drawer again once the pick was cancelled", () => {
        transport.beginImageEdit(IMAGE, pageImage()).pickInTheDrawer();
        postFromAdmin({ ...IMAGE, type: VE_MEDIA_PICK_CANCELLED_TYPE });

        transport.beginImageEdit(IMAGE, pageImage()).pickInTheDrawer();

        expect(picks()).toHaveLength(2);
      });

      it("is asked of the drawer again once the pick took too long", () => {
        transport.beginImageEdit(IMAGE, pageImage()).pickInTheDrawer();
        vi.advanceTimersByTime(MEDIA_PICK_TIME_LIMIT_MS);

        transport.beginImageEdit(IMAGE, pageImage()).pickInTheDrawer();

        expect(picks()).toHaveLength(2);
      });

      it.each([
        ["was cancelled", () => postFromAdmin({ ...IMAGE, type: VE_MEDIA_PICK_CANCELLED_TYPE })],
        ["took too long", () => vi.advanceTimersByTime(MEDIA_PICK_TIME_LIMIT_MS)],
      ])("releases the route of an image once its pick in the drawer %s", (_name, endThePick) => {
        const replacement = { postMessage: vi.fn() };
        transport.beginImageEdit(IMAGE, pageImage()).pickInTheDrawer();

        endThePick();
        stubAdminWindow(replacement);

        expect(routes.adminOf(IMAGE)).toBe(replacement);
      });

      it("picked on the page is written by the admin and counted unsaved until the admin saved its document", () => {
        transport.beginImageEdit(IMAGE, pageImage("3")).use(LIGHTHOUSE);
        expect(statuses).toEqual(["in-form"]);

        savedInTheAdmin({ ...TITLE, docId: "2" });
        expect(statuses).toEqual(["in-form"]);

        savedInTheAdmin(TITLE);
        expect(statuses).toEqual(["in-form", "saved"]);
        expect(posted()).toEqual([{ ...IMAGE, mediaId: 9, type: VE_PICK_MEDIA_TYPE }]);
        expect(fetchEndpoint).not.toHaveBeenCalled();
      });

      it("picked on the page and refused by the form is not saved, and asked for again on Retry", () => {
        const image = pageImage();
        transport.beginImageEdit(IMAGE, image).use(LIGHTHOUSE);

        refusedByTheForm(IMAGE, "not-editable");
        expect(statuses).toEqual(["in-form", "failed"]);
        expect(refusals.at(-1)).toBe("not-editable");
        expect(image.openField).toHaveBeenCalledTimes(1);

        transport.retry();

        expect(statuses.at(-1)).toBe("in-form");
        expect(picks()).toEqual([
          { ...IMAGE, mediaId: 9, type: VE_PICK_MEDIA_TYPE },
          { ...IMAGE, mediaId: 9, type: VE_PICK_MEDIA_TYPE },
        ]);
      });

      it("refused by the form is forgotten once the form holds a newer pick of the field", () => {
        transport.beginImageEdit(IMAGE, pageImage()).use(LIGHTHOUSE);
        refusedByTheForm(IMAGE);

        transport.beginImageEdit(IMAGE, pageImage()).use({ ...LIGHTHOUSE, id: 10 });
        transport.retry();

        expect(statuses.at(-1)).toBe("in-form");
        expect(picks().map((pick) => (pick as { mediaId: number }).mediaId)).toEqual([9, 10]);
      });
    });
  });

  describe("of a window the admin opened", () => {
    const admin = { closed: false, postMessage: vi.fn() };

    beforeEach(() => {
      admin.closed = false;
      admin.postMessage.mockClear();
      stubOpenerWindow(admin);
      start();
    });

    it("keeps an edit on the endpoint it began with once the admin told of a form", async () => {
      const edit = beginEdit(TITLE, "Shown");
      holdsAnyForm = true;

      edit.change("Hello");
      edit.end();
      await settle();

      expect(admin.postMessage).not.toHaveBeenCalled();
      expect(fetchEndpoint).toHaveBeenCalledTimes(1);
    });

    it("keeps the route of an edit while it runs", () => {
      beginEdit(TITLE, "Shown");

      holdsAnyForm = true;

      expect(routes.adminOf(TITLE)).toBeNull();
    });

    it("releases the route of an edit once it ended and its save is done", async () => {
      save(TITLE, "Shown", "Hello");
      holdsAnyForm = true;

      await settle();

      expect(routes.adminOf(TITLE)).toBe(admin);
    });

    it("keeps the route of an ended edit while its save failed, and releases it once Retry saves it", async () => {
      fetchEndpoint.mockImplementationOnce(() => Promise.resolve(answerOf(false)));
      save(TITLE, "Shown", "Hello");
      await settle();
      holdsAnyForm = true;
      expect(routes.adminOf(TITLE)).toBeNull();

      transport.retry();
      await settle();

      expect(admin.postMessage).not.toHaveBeenCalled();
      expect(routes.adminOf(TITLE)).toBe(admin);
    });

    it("sends an edit begun in the form to the endpoint once that window closed, naming the value the form was given", async () => {
      holdsAnyForm = true;
      const edit = beginEdit(TITLE, "Shown");
      edit.change("Shown c");
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

      admin.closed = true;
      edit.change("Shown cd");
      edit.end();
      await settle();

      expect(admin.postMessage).toHaveBeenCalledTimes(1);
      expect(sentBodies()).toEqual([
        { ...TITLE, base: "Shown", sentBefore: "Shown c", value: "Shown cd" },
      ]);
      expect(statuses.at(-1)).toBe("saved");
    });

    it("forgets the value the form was given once the endpoint saved the field", async () => {
      holdsAnyForm = true;
      const edit = beginEdit(TITLE, "Shown");
      edit.change("Shown c");
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);
      admin.closed = true;
      edit.change("Shown cd");
      edit.end();
      await settle();

      save(TITLE, "Other", "Other e");
      await settle();

      expect(sentBodies()[1]).not.toHaveProperty("sentBefore");
    });

    it("bases an edit on what it began from once an edit of the field went to the admin in between", async () => {
      fetchEndpoint.mockImplementationOnce(() => Promise.resolve(storedAnswerOf("Typed")));
      save(TITLE, "Shown", " Typed ");
      await settle();

      holdsAnyForm = true;
      save(TITLE, "Typed", "Shown");
      holdsAnyForm = false;
      save(TITLE, "Shown", "Again");
      await settle();

      expect(admin.postMessage).toHaveBeenCalledTimes(1);
      expect(sentBodies().map(({ base }) => base)).toEqual(["Shown", "Shown"]);
    });

    it("keeps the route of an edit the form holds, so its Retry goes to the endpoint once that window was replaced", async () => {
      const replacement = { closed: false, postMessage: vi.fn() };
      holdsAnyForm = true;
      save(TITLE, "Shown", "Hello");
      postFromAdmin({ ...TITLE, type: VE_FIELD_EDIT_REFUSED_TYPE }, { source: admin });
      stubOpenerWindow(replacement);

      transport.retry();
      await settle();

      expect(replacement.postMessage).not.toHaveBeenCalled();
      expect(sentBodies()).toEqual([
        { ...TITLE, base: "Shown", sentBefore: "Hello", value: "Hello" },
      ]);
    });

    it("saves a pick the form refused through the endpoint on Retry once that window was replaced, even after the admin saved its document", async () => {
      const replacement = { closed: false, postMessage: vi.fn() };
      holdsAnyForm = true;
      transport.beginImageEdit(IMAGE, pageImage()).use(LIGHTHOUSE);
      postFromAdmin({ ...IMAGE, type: VE_FIELD_EDIT_REFUSED_TYPE }, { source: admin });
      postFromAdmin({ ...TITLE, type: VE_DOCUMENT_SAVED_TYPE }, { source: admin });
      stubOpenerWindow(replacement);

      transport.retry();
      await settle();

      expect(replacement.postMessage).not.toHaveBeenCalled();
      expect(sentBodies()).toEqual([{ ...IMAGE, value: "9" }]);
    });

    it("saves a picked image again through the endpoint on Retry once the admin told of a form", async () => {
      fetchEndpoint.mockImplementationOnce(() => Promise.resolve(answerOf(false)));
      transport.beginImageEdit(IMAGE, pageImage()).use(LIGHTHOUSE);
      await settle();
      holdsAnyForm = true;

      transport.retry();
      await settle();

      expect(admin.postMessage).not.toHaveBeenCalled();
      expect(fetchEndpoint).toHaveBeenCalledTimes(2);
      expect(statuses.at(-1)).toBe("saved");
    });

    it("asks no drawer of a window it is not framed by", () => {
      holdsAnyForm = true;

      expect(transport.beginImageEdit(IMAGE, pageImage()).pickInTheDrawer()).toBe(false);
      expect(admin.postMessage).not.toHaveBeenCalled();
    });
  });

  describe("of a page on its own", () => {
    beforeEach(start);

    it("posts the value to the endpoint with the session of the editor", async () => {
      beginEdit({ ...TITLE, locale: "en" }, "Shown").change("Hello");

      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      expect(fetchEndpoint).toHaveBeenCalledWith(`${PAYLOAD_API}/visual-editing/field-edit`, {
        body: JSON.stringify({ ...TITLE, locale: "en", base: "Shown", value: "Hello" }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        method: "POST",
      });
      expect(statuses).toEqual(["unsaved", "saving", "saved"]);
    });

    it("posts an edited rich text state to the same endpoint and says when it is saved", async () => {
      const edit = beginRichTextEdit(BODY, STATE);
      edit.change(CHANGED_STATE);
      expect(edit.isUnsaved()).toBe(true);
      expect(edit.goesToTheAdmin()).toBe(false);

      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      const [url, init] = fetchEndpoint.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${PAYLOAD_API}/visual-editing/field-edit`);
      expect(JSON.parse(init.body as string)).toEqual({
        ...BODY,
        base: STATE,
        state: CHANGED_STATE,
      });
      expect(init.keepalive).toBe(true);
      expect(onEdited).toHaveBeenCalledTimes(1);
      expect(edit.isUnsaved()).toBe(false);
    });

    describe("the base of an edit", () => {
      const basesSent = () => sentBodies().map(({ base }) => base);

      it("is the value the edit began from for its first save", async () => {
        save(TITLE, "Shown", "Typed");
        await settle();

        expect(basesSent()).toEqual(["Shown"]);
      });

      it("is the value the field holds after the last save of the same edit", async () => {
        fetchEndpoint.mockImplementationOnce(() => Promise.resolve(storedAnswerOf("Typed")));
        save(TITLE, "Shown", " Typed ");
        await settle();

        save(TITLE, "Shown", "Typed more");
        await settle();

        expect(basesSent()).toEqual(["Shown", "Typed"]);
      });

      it("is the value the field holds after the last save when an edit begins from what it sent", async () => {
        fetchEndpoint.mockImplementationOnce(() => Promise.resolve(storedAnswerOf("Typed")));
        save(TITLE, "Shown", " Typed ");
        await settle();

        save(TITLE, " Typed ", "Again");
        await settle();

        expect(basesSent()).toEqual(["Shown", "Typed"]);
      });

      describe("of an edit begun from what an earlier edit of the field saved", () => {
        const storedAsSent = (_url: string, init: RequestInit) => {
          const { state, value } = JSON.parse(init.body as string) as Record<string, unknown>;
          return Promise.resolve(storedAnswerOf(state ?? value));
        };

        beforeEach(() => {
          fetchEndpoint.mockImplementation(storedAsSent);
        });

        it("is the text the field holds after each save of it", async () => {
          save(TITLE, "Shown", "Shown T0");
          await settle();

          const edit = beginEdit(TITLE, "Shown T0");
          edit.change("Shown T0 T1");
          await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);
          edit.change("Shown T0 T1 T2");
          await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);
          edit.end();
          await settle();

          expect(basesSent()).toEqual(["Shown", "Shown T0", "Shown T0 T1"]);
        });

        it("is the rich text state the field holds after each save of it", async () => {
          const typed = editorState(paragraph(textNode("Hello T0")));
          const typedOn = editorState(paragraph(textNode("Hello T0 T1")));
          const madeBold = editorState(paragraph(textNode("Hello T0 T1", 1)));
          saveRichText(BODY, STATE, typed);
          await settle();

          const edit = beginRichTextEdit(BODY, typed);
          edit.change(typedOn);
          await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);
          edit.change(madeBold);
          await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);
          edit.end();
          await settle();

          expect(basesSent()).toEqual([STATE, typed, typedOn]);
        });
      });

      it("is the value an edit began from when it began from something this page did not save", async () => {
        save(TITLE, "Shown", "Typed");
        await settle();

        save(TITLE, "Rendered again", "Again");
        await settle();

        expect(basesSent()).toEqual(["Shown", "Rendered again"]);
      });

      it("is the value the edit sent when the endpoint answers no value", async () => {
        saveRichText(BODY, STATE, CHANGED_STATE);
        await settle();

        saveRichText(BODY, STATE, STATE);
        await settle();

        expect(basesSent()).toEqual([STATE, CHANGED_STATE]);
      });

      it("is the media id an image showed, and none when it showed none", async () => {
        transport.beginImageEdit(IMAGE, pageImage("3")).use(LIGHTHOUSE);
        await settle();
        transport.beginImageEdit(IMAGE, pageImage()).use(LIGHTHOUSE);
        await settle();

        expect(sentBodies()).toEqual([
          { ...IMAGE, base: "3", value: "9" },
          { ...IMAGE, value: "9" },
        ]);
      });
    });

    describe("of a document whose drafts do not autosave", () => {
      beforeEach(async () => {
        fetchEndpoint.mockImplementation(() => Promise.resolve(withoutAutosave()));
        beginEdit(TITLE, "Shown").change("First");
        await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);
      });

      afterEach(async () => {
        transport.leavePage();
        await settle();
      });

      it("saves nothing more on a pause, so every pause adds no version", async () => {
        beginEdit(TITLE, "Shown").change("Second");
        beginEdit(LEAD, "Shown").change("Lead");
        await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS * 10);

        expect(fetchEndpoint).toHaveBeenCalledTimes(1);
        expect(statuses.at(-1)).toBe("unsaved");
      });

      it("saves the latest value once when the edit ends", async () => {
        const edit = beginEdit(TITLE, "Shown");
        edit.change("Second");
        edit.change("Third");

        edit.end();
        await settle();

        expect(fetchEndpoint).toHaveBeenCalledTimes(2);
        expect(statuses.at(-1)).toBe("saved");
      });

      it("keeps saving on a pause the edits of another document", async () => {
        beginEdit({ ...TITLE, docId: "2" }, "Shown").change("Other");
        await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

        expect(fetchEndpoint).toHaveBeenCalledTimes(2);
      });
    });

    describe("a field changed elsewhere", () => {
      beforeEach(async () => {
        fetchEndpoint.mockImplementationOnce(() => Promise.resolve(refusalOf("changed")));
        save(TITLE, "Shown", "Typed");
        await settle();
      });

      it("says so", () => {
        expect(statuses.at(-1)).toBe("failed");
        expect(refusals.at(-1)).toBe("changed");
      });

      it("keeps saying so and sends nothing more while the editor types on", async () => {
        const edit = beginEdit(TITLE, "Shown");
        edit.change("Typed on");
        await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

        expect(fetchEndpoint).toHaveBeenCalledTimes(1);
        expect(statuses.at(-1)).toBe("failed");
        expect(refusals.at(-1)).toBe("changed");
        expect(edit.isUnsaved()).toBe(true);
      });

      it("keeps other fields saving", async () => {
        save(LEAD, "", "Lead");
        await settle();

        expect(fetchEndpoint).toHaveBeenCalledTimes(2);
        expect(refusals.at(-1)).toBe("changed");
      });
    });

    it("does not ask the browser to keep a request alive that is too long for it", async () => {
      const long = editorState(paragraph(textNode("a".repeat(KEEPALIVE_BODY_LIMIT))));

      saveRichText(BODY, STATE, long);
      await settle();

      const [, init] = fetchEndpoint.mock.calls[0] as [string, RequestInit];
      expect(init.keepalive).toBe(false);
    });

    it("measures the body in bytes, as the browser does, before it asks to keep a request alive", async () => {
      const cyrillic = editorState(paragraph(textNode("я".repeat(KEEPALIVE_BODY_LIMIT / 2))));

      saveRichText(BODY, STATE, cyrillic);
      await settle();

      const [, init] = fetchEndpoint.mock.calls[0] as [string, RequestInit];
      expect(init.keepalive).toBe(false);
    });

    it("counts an edit the endpoint refused as unsaved and tells no one that it was saved", async () => {
      fetchEndpoint.mockImplementationOnce(() => Promise.resolve(answerOf(false)));

      const edit = saveRichText(BODY, STATE, CHANGED_STATE);
      await settle();

      expect(edit.isUnsaved()).toBe(true);
      expect(onEdited).not.toHaveBeenCalled();
    });

    it("saves one edit after the other", async () => {
      const answers: ((answer: Response) => void)[] = [];
      fetchEndpoint.mockImplementationOnce(
        () => new Promise<Response>((resolve) => answers.push(resolve))
      );
      save(TITLE, "Shown", "First");
      await settle();
      save(TITLE, "Shown", "Second");
      await settle();
      expect(fetchEndpoint).toHaveBeenCalledTimes(1);

      answers[0]?.(answerOf(true));
      await settle();

      expect(fetchEndpoint).toHaveBeenCalledTimes(2);
    });

    it("starts every save at once when the page is left, without waiting for the one on the way", async () => {
      fetchEndpoint.mockImplementationOnce(() => new Promise<Response>(() => {}));
      save(TITLE, "Shown", "First");
      const body = beginRichTextEdit(BODY, STATE);
      body.hold(CHANGED_STATE);
      body.end();
      beginEdit(LEAD, "Shown").change("Lead");
      await settle();
      expect(fetchEndpoint).toHaveBeenCalledTimes(1);

      transport.leavePage();
      await settle();

      expect(sentBodies().map(({ key }) => key)).toEqual(["title", "body", "lead"]);
    });

    describe("a save of a field whose earlier save is still on the way when the page is left", () => {
      let answers: ((answer: Response) => void)[];
      let edit: FieldEdit<string>;

      beforeEach(async () => {
        answers = [];
        fetchEndpoint.mockImplementation(
          () => new Promise<Response>((resolve) => answers.push(resolve))
        );
        save(TITLE, "Shown", "First");
        await settle();
        edit = beginEdit(TITLE, "Shown");
        edit.change("Second");
        transport.leavePage();
        await settle();
      });

      it("is sent at once and names the value of the earlier one, which may land first", () => {
        expect(sentBodies()).toEqual([
          { ...TITLE, base: "Shown", value: "First" },
          { ...TITLE, base: "Shown", sentBefore: "First", value: "Second" },
        ]);
      });

      it("decides the status alone, whatever the earlier one is answered", async () => {
        answers[1]?.(answerOf(true));
        await settle();
        answers[0]?.(refusalOf("changed"));
        await settle();

        expect(statuses.at(-1)).toBe("saved");
        expect(edit.isUnsaved()).toBe(false);
      });
    });

    it("skips a save that a newer save of the same field replaced before its turn came", async () => {
      const answers: ((answer: Response) => void)[] = [];
      fetchEndpoint.mockImplementation(
        () => new Promise<Response>((resolve) => answers.push(resolve))
      );
      save(LEAD, "Shown", "Lead");
      save(TITLE, "Shown", "First");
      save(TITLE, "Shown", "Second");
      await settle();

      answers[0]?.(answerOf(true));
      await settle();
      answers[1]?.(answerOf(true));
      await settle();

      expect(sentBodies().map(({ value }) => value)).toEqual(["Lead", "Second"]);
      expect(statuses.at(-1)).toBe("saved");
    });

    it("saves one edit after the other again once the page is shown after it was left", async () => {
      fetchEndpoint.mockImplementation(() => new Promise<Response>(() => {}));
      beginEdit(TITLE, "Shown").change("First");
      transport.leavePage();
      await settle();

      save(TITLE, "Shown", "Second");
      await settle();

      expect(fetchEndpoint).toHaveBeenCalledTimes(1);
    });

    it("says the edits are saved only once nothing waits and nothing is on the way", async () => {
      const answers: ((answer: Response) => void)[] = [];
      fetchEndpoint.mockImplementation(
        () => new Promise<Response>((resolve) => answers.push(resolve))
      );
      transport.beginImageEdit(IMAGE, pageImage()).use(LIGHTHOUSE);
      beginEdit(TITLE, "Shown").change("Hello");
      await settle();

      answers[0]?.(answerOf(true));
      await settle();
      expect(statuses.at(-1)).toBe("unsaved");

      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);
      expect(statuses.at(-1)).toBe("saving");

      answers[1]?.(answerOf(true));
      await settle();
      expect(statuses.at(-1)).toBe("saved");
    });

    it("keeps saying it saves while a later save is still on the way", async () => {
      const answers: ((answer: Response) => void)[] = [];
      fetchEndpoint.mockImplementation(
        () => new Promise<Response>((resolve) => answers.push(resolve))
      );
      transport.beginImageEdit(IMAGE, pageImage()).use(LIGHTHOUSE);
      save(TITLE, "Shown", "Hello");
      await settle();

      answers[0]?.(answerOf(true));
      await settle();
      expect(statuses).not.toContain("saved");

      answers[1]?.(answerOf(true));
      await settle();
      expect(statuses.at(-1)).toBe("saved");
    });

    it.each([
      ["refuses the edit", () => Promise.resolve(answerOf(false))],
      ["answers an error", () => Promise.resolve(answerOf(true, false))],
      ["cannot be reached", () => Promise.reject(new Error("offline"))],
    ])("says the value is not saved when the endpoint %s", async (_name, answer) => {
      fetchEndpoint.mockImplementationOnce(answer);
      beginEdit(TITLE, "Shown").change("Hello");

      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      expect(statuses).toEqual(["unsaved", "saving", "failed"]);
    });

    it("sends the edit that failed again when asked to", async () => {
      fetchEndpoint.mockImplementationOnce(() => Promise.resolve(answerOf(false)));
      beginEdit(TITLE, "Shown").change("Hello");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      transport.retry();
      await settle();

      expect(fetchEndpoint).toHaveBeenCalledTimes(2);
      expect(statuses.at(-1)).toBe("saved");
    });

    it("keeps saying an edit is not saved while another field saves", async () => {
      fetchEndpoint.mockImplementationOnce(() => Promise.resolve(answerOf(false)));
      beginEdit(TITLE, "Shown").change("Title");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      beginEdit(LEAD, "Shown").change("Lead");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      expect(statuses.at(-1)).toBe("failed");
    });

    it("keeps saying an edit is not saved while the editor types in another field", async () => {
      fetchEndpoint.mockImplementationOnce(() => Promise.resolve(refusalOf("locked")));
      beginEdit(TITLE, "Shown").change("Title");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      beginEdit(LEAD, "Shown").change("Lead");

      expect(statuses.at(-1)).toBe("failed");
      expect(refusals.at(-1)).toBe("locked");
    });

    it("says changes are unsaved as soon as the editor types in the field that failed", async () => {
      fetchEndpoint.mockImplementationOnce(() => Promise.resolve(answerOf(false)));
      const edit = beginEdit(TITLE, "Shown");
      edit.change("First");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      edit.change("Second");

      expect(statuses.at(-1)).toBe("unsaved");
      expect(refusals.at(-1)).toBeUndefined();
    });

    it.each(["locked", "no-drafts", "not-editable", "signed-out", "failed"])(
      "tells why the endpoint refused an edit: %s",
      async (reason) => {
        fetchEndpoint.mockImplementationOnce(() => Promise.resolve(refusalOf(reason)));

        save(TITLE, "Shown", "Hello");
        await settle();

        expect(statuses.at(-1)).toBe("failed");
        expect(refusals.at(-1)).toBe(reason);
      }
    );

    it.each([
      ["a reason it does not know", () => Promise.resolve(refusalOf("on-fire"))],
      ["no reason", () => Promise.resolve(answerOf(false))],
      ["no answer", () => Promise.reject(new Error("offline"))],
    ])("says no more than that the edit is not saved for %s", async (_name, answer) => {
      fetchEndpoint.mockImplementationOnce(answer);

      save(TITLE, "Shown", "Hello");
      await settle();

      expect(statuses.at(-1)).toBe("failed");
      expect(refusals.at(-1)).toBe("failed");
    });

    describe("a cancelled edit", () => {
      it("saves nothing when none of its values was sent", async () => {
        const edit = beginEdit(TITLE, "Shown");
        edit.change("Dropped");

        edit.cancel();
        await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

        expect(fetchEndpoint).not.toHaveBeenCalled();
        expect(statuses).toEqual(["unsaved", "saved"]);
      });

      it("saves the value it began with once one of its values was sent", async () => {
        const edit = beginEdit(TITLE, "Shown");
        edit.change("Delivered");
        await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

        edit.cancel();
        await settle();

        expect(sentBodies()).toEqual([
          { ...TITLE, base: "Shown", value: "Delivered" },
          { ...TITLE, base: "Delivered", value: "Shown" },
        ]);
      });

      it("of rich text drops a state it holds without saving it", async () => {
        const edit = beginRichTextEdit(BODY, STATE);
        edit.hold(CHANGED_STATE);

        edit.cancel();
        await settle();

        expect(fetchEndpoint).not.toHaveBeenCalled();
        expect(statuses).toEqual(["unsaved", "saved"]);
        expect(edit.isUnsaved()).toBe(false);
      });

      it("of rich text saves the state it began with once one of its states was sent", async () => {
        const edit = beginRichTextEdit(BODY, STATE);
        edit.change(CHANGED_STATE);
        await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);
        edit.hold(editorState(paragraph(textNode("Hello world!"))));

        edit.cancel();
        await settle();

        expect(sentBodies().map(({ state }) => state)).toEqual([CHANGED_STATE, STATE]);
      });
    });

    it("sends every edit that failed again", async () => {
      fetchEndpoint.mockImplementation(() => Promise.resolve(answerOf(false)));
      beginEdit(TITLE, "Shown").change("Title");
      beginEdit(LEAD, "Shown").change("Lead");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);
      fetchEndpoint.mockClear();
      fetchEndpoint.mockImplementation(() => Promise.resolve(answerOf(true)));

      transport.retry();
      await settle();

      expect(fetchEndpoint).toHaveBeenCalledTimes(2);
      expect(statuses.at(-1)).toBe("saved");
    });

    it("forgets a failure of a field once a newer edit of it saves", async () => {
      fetchEndpoint.mockImplementationOnce(() => Promise.resolve(answerOf(false)));
      const edit = beginEdit(TITLE, "Shown");
      edit.change("First");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      edit.change("Second");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      expect(statuses.at(-1)).toBe("saved");
    });

    it("has nothing to send again after a save", async () => {
      beginEdit(TITLE, "Shown").change("Hello");
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      transport.retry();
      await settle();

      expect(fetchEndpoint).toHaveBeenCalledTimes(1);
    });

    it("holds a rich text state unsaved for as long as it takes, and saves it when the edit ends", async () => {
      const edit = beginRichTextEdit(BODY, STATE);
      edit.hold(CHANGED_STATE);
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS * 10);

      expect(fetchEndpoint).not.toHaveBeenCalled();
      expect(statuses).toEqual(["unsaved"]);
      expect(edit.isUnsaved()).toBe(true);

      edit.end();
      await settle();

      expect(fetchEndpoint).toHaveBeenCalledTimes(1);
      expect(statuses.at(-1)).toBe("saved");
      expect(edit.isUnsaved()).toBe(false);
    });

    it("keeps saying that changes are unsaved when it drops one edit while another waits", () => {
      beginEdit(TITLE, "Shown").change("Hello");
      const body = beginRichTextEdit(BODY, STATE);
      body.hold(CHANGED_STATE);

      body.cancel();

      expect(statuses.at(-1)).toBe("unsaved");
    });

    it("saves a picked image at once and leaves the waiting edits waiting", async () => {
      beginEdit(TITLE, "Shown").change("Hello");

      transport.beginImageEdit(IMAGE, pageImage()).use(LIGHTHOUSE);
      await settle();

      expect(sentBodies()).toEqual([{ ...IMAGE, value: "9" }]);

      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);
      expect(fetchEndpoint).toHaveBeenCalledTimes(2);
    });

    it("shows a picked image at once, puts the shown one back when its save fails, and shows it again when Retry saves it", async () => {
      fetchEndpoint.mockImplementationOnce(() => Promise.resolve(answerOf(false)));
      const image = pageImage("3");

      transport.beginImageEdit(IMAGE, image).use(LIGHTHOUSE);
      expect(image.show).toHaveBeenCalledWith(LIGHTHOUSE);
      await settle();
      expect(image.putBack).toHaveBeenCalledTimes(1);

      transport.retry();
      await settle();

      expect(image.show).toHaveBeenCalledTimes(2);
      expect(image.putBack).toHaveBeenCalledTimes(1);
    });

    it("sends what is waiting when it is disposed and reports nothing after", async () => {
      beginEdit(TITLE, "Shown").change("Hello");

      transport.dispose();
      await settle();

      expect(fetchEndpoint).toHaveBeenCalledTimes(1);
      expect(statuses).toEqual(["unsaved"]);
    });
  });
});
