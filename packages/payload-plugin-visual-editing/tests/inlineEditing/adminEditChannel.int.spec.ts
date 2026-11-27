import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AdminAnswers,
  AdminEditChannel,
} from "../../src/client/inlineEditing/adminEditChannel";
import type {
  VeFieldEditMessage,
  VePickMediaMessage,
  VeRichTextStateRequestMessage,
} from "../../src/shared/protocol";

import {
  CLOSED_ADMIN_CHECK_MS,
  createAdminEditChannel,
  MEDIA_API_TIME_LIMIT_MS,
  MEDIA_PICK_TIME_LIMIT_MS,
  RICH_TEXT_STATE_TIME_LIMIT_MS,
} from "../../src/client/inlineEditing/adminEditChannel";
import {
  VE_DOCUMENT_SAVED_TYPE,
  VE_FIELD_EDIT_REFUSED_TYPE,
  VE_FIELD_EDIT_TYPE,
  VE_FIELD_PATCH_TYPE,
  VE_MEDIA_OPTIONS_ANSWER_TYPE,
  VE_MEDIA_OPTIONS_REQUEST_TYPE,
  VE_MEDIA_PICK_CANCELLED_TYPE,
  VE_MEDIA_PICKED_TYPE,
  VE_MEDIA_UPLOAD_ANSWER_TYPE,
  VE_MEDIA_UPLOAD_TYPE,
  VE_PICK_MEDIA_TYPE,
  VE_RICH_TEXT_STATE_REFUSED_TYPE,
  VE_RICH_TEXT_STATE_REQUEST_TYPE,
  VE_RICH_TEXT_STATE_TYPE,
} from "../../src/shared/protocol";

import { editorState, paragraph, textNode } from "../support/editorState";
import {
  ADMIN_ORIGIN,
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
} from "../support/previewWindow";

const IMAGE = { collectionSlug: "page", docId: "1", key: "image", kind: "collection" } as const;

const BODY = { ...IMAGE, key: "body" };

const PICK: VePickMediaMessage = { ...IMAGE, type: VE_PICK_MEDIA_TYPE };

const STATE_REQUEST: VeRichTextStateRequestMessage = {
  ...BODY,
  type: VE_RICH_TEXT_STATE_REQUEST_TYPE,
};

const STATE = editorState(paragraph(textNode("Hello")));

const FORMATS = { hasLinks: false, hasQuotes: false, headings: [], lists: [], textFormats: 1 };

type AdminWindow = { closed: boolean; postMessage: ReturnType<typeof vi.fn> };

const answersOf = <Answer>() => ({
  answered: vi.fn<(answer: Answer) => void>(),
  cancelled: vi.fn<() => void>(),
  refused: vi.fn<AdminAnswers<Answer>["refused"]>(),
});

describe("the channel of the page to the admin for edits", () => {
  let channel: AdminEditChannel;
  let admin: AdminWindow;

  const adminWindow = () => admin as unknown as Window;

  beforeEach(() => {
    vi.useFakeTimers();
    admin = { closed: false, postMessage: vi.fn() };
    stubAdminWindow(admin);
    channel = createAdminEditChannel(window, () => ADMIN_ORIGIN);
  });

  afterEach(() => {
    channel.dispose();
    restorePreviewWindow();
    vi.useRealTimers();
  });

  it("tells the admin on its origin", () => {
    const edit: VeFieldEditMessage = {
      ...IMAGE,
      key: "title",
      type: VE_FIELD_EDIT_TYPE,
      value: "Hello",
    };

    channel.tell(adminWindow(), edit);

    expect(admin.postMessage).toHaveBeenCalledWith(edit, ADMIN_ORIGIN);
  });

  it("tells and hears the admin on the origin of the page it runs in when no admin origin is given", () => {
    const pageOrigin = "https://site.example.com";
    const pageEvents = new EventTarget();
    const otherAdmin = { closed: false, postMessage: vi.fn() };
    const page = {
      addEventListener: pageEvents.addEventListener.bind(pageEvents),
      location: { origin: pageOrigin },
      parent: otherAdmin,
      removeEventListener: pageEvents.removeEventListener.bind(pageEvents),
    } as unknown as Window;
    const edit: VeFieldEditMessage = { ...IMAGE, type: VE_FIELD_EDIT_TYPE, value: "Hello" };
    const refused = vi.fn();
    const pageChannel = createAdminEditChannel(page, () => "");
    pageChannel.onRefusedEdit(refused);
    const refusal = new MessageEvent("message", {
      data: { ...IMAGE, type: VE_FIELD_EDIT_REFUSED_TYPE },
      origin: pageOrigin,
    });
    Object.defineProperty(refusal, "source", { value: otherAdmin });

    pageChannel.tell(otherAdmin as unknown as Window, edit);
    pageEvents.dispatchEvent(refusal);
    pageChannel.dispose();

    expect(otherAdmin.postMessage).toHaveBeenCalledWith(edit, pageOrigin);
    expect(refused).toHaveBeenCalledWith(IMAGE, "failed");
  });

  it("answers a pick of the field it was asked for, once", () => {
    const answers = answersOf();
    channel.mediaPicks.ask(adminWindow(), PICK, answers);

    postFromAdmin({ ...BODY, type: VE_MEDIA_PICKED_TYPE, url: "/other.jpg" });
    postFromAdmin({ ...IMAGE, type: VE_MEDIA_PICKED_TYPE, url: "/lighthouse.jpg", width: 640 });
    postFromAdmin({ ...IMAGE, type: VE_MEDIA_PICKED_TYPE, url: "/again.jpg" });

    expect(admin.postMessage).toHaveBeenCalledWith(PICK, ADMIN_ORIGIN);
    expect(answers.answered).toHaveBeenCalledTimes(1);
    expect(answers.answered).toHaveBeenCalledWith({ url: "/lighthouse.jpg", width: 640 });
    expect(channel.mediaPicks.isAsked(IMAGE)).toBe(false);
  });

  it("hands a refusal its reason, and a refusal without one as failed", () => {
    const named = answersOf();
    const unnamed = answersOf();
    channel.mediaPicks.ask(adminWindow(), PICK, named);
    channel.richTextStates.ask(adminWindow(), STATE_REQUEST, unnamed);

    postFromAdmin({ ...IMAGE, reason: "locked", type: VE_FIELD_EDIT_REFUSED_TYPE });
    postFromAdmin({ ...BODY, type: VE_RICH_TEXT_STATE_REFUSED_TYPE });

    expect(named.refused).toHaveBeenCalledWith("locked");
    expect(unnamed.refused).toHaveBeenCalledWith("failed");
  });

  it("refuses an answer it cannot read", () => {
    const answers = answersOf();
    channel.richTextStates.ask(adminWindow(), STATE_REQUEST, answers);

    postFromAdmin({ ...BODY, state: STATE, type: VE_RICH_TEXT_STATE_TYPE });

    expect(answers.answered).not.toHaveBeenCalled();
    expect(answers.refused).toHaveBeenCalledWith("failed");
  });

  it("answers a state with its formats", () => {
    const answers = answersOf();
    channel.richTextStates.ask(adminWindow(), STATE_REQUEST, answers);

    postFromAdmin({ ...BODY, formats: FORMATS, state: STATE, type: VE_RICH_TEXT_STATE_TYPE });

    expect(answers.answered).toHaveBeenCalledWith({ formats: FORMATS, state: STATE });
  });

  it("tells a cancelled pick, and takes no message without a type for one", () => {
    const pick = answersOf();
    const state = answersOf();
    channel.mediaPicks.ask(adminWindow(), PICK, pick);
    channel.richTextStates.ask(adminWindow(), STATE_REQUEST, state);

    postFromAdmin({ ...BODY });
    postFromAdmin({ ...IMAGE, type: VE_MEDIA_PICK_CANCELLED_TYPE });

    expect(pick.cancelled).toHaveBeenCalledTimes(1);
    expect(channel.richTextStates.isAsked(BODY)).toBe(true);
  });

  it("asks once while a request is open, and again after its time limit", () => {
    channel.mediaPicks.ask(adminWindow(), PICK, answersOf());
    channel.mediaPicks.ask(adminWindow(), PICK, answersOf());
    vi.advanceTimersByTime(MEDIA_PICK_TIME_LIMIT_MS);
    channel.mediaPicks.ask(adminWindow(), PICK, answersOf());

    expect(admin.postMessage).toHaveBeenCalledTimes(2);
  });

  it("holds a request of a state open only for its own time limit", () => {
    channel.richTextStates.ask(adminWindow(), STATE_REQUEST, answersOf());
    vi.advanceTimersByTime(RICH_TEXT_STATE_TIME_LIMIT_MS - 1);

    expect(channel.richTextStates.isAsked(BODY)).toBe(true);

    vi.advanceTimersByTime(1);

    expect(channel.richTextStates.isAsked(BODY)).toBe(false);
  });

  it("takes no state that arrives after its time limit, as the page opened the field instead", () => {
    const answers = answersOf();
    channel.richTextStates.ask(adminWindow(), STATE_REQUEST, answers);
    vi.advanceTimersByTime(RICH_TEXT_STATE_TIME_LIMIT_MS);

    postFromAdmin({ ...BODY, formats: FORMATS, state: STATE, type: VE_RICH_TEXT_STATE_TYPE });
    postFromAdmin({ ...BODY, type: VE_RICH_TEXT_STATE_REFUSED_TYPE });

    expect(answers.answered).not.toHaveBeenCalled();
    expect(answers.refused).not.toHaveBeenCalled();
  });

  it("takes a pick that arrives after its time limit, as the drawer of the admin stays open", () => {
    const answers = answersOf();
    channel.mediaPicks.ask(adminWindow(), PICK, answers);
    vi.advanceTimersByTime(MEDIA_PICK_TIME_LIMIT_MS);

    postFromAdmin({ ...IMAGE, type: VE_MEDIA_PICKED_TYPE, url: "/lighthouse.jpg" });

    expect(answers.answered).toHaveBeenCalledWith({ url: "/lighthouse.jpg" });
  });

  it("asks another admin window or one whose admin was closed again", () => {
    const other = { closed: false, postMessage: vi.fn() };
    channel.mediaPicks.ask(adminWindow(), PICK, answersOf());

    expect(channel.mediaPicks.isAsked(IMAGE, other as unknown as Window)).toBe(false);

    admin.closed = true;

    expect(channel.mediaPicks.isAsked(IMAGE)).toBe(false);
  });

  it("forgets a request, so its late answer is not taken", () => {
    const answers = answersOf();
    channel.richTextStates.ask(adminWindow(), STATE_REQUEST, answers);
    channel.richTextStates.forget(BODY);

    postFromAdmin({ ...BODY, formats: FORMATS, state: STATE, type: VE_RICH_TEXT_STATE_TYPE });

    expect(answers.answered).not.toHaveBeenCalled();
  });

  it("tells every refused edit and every news of a document to whoever listens", () => {
    const refused = vi.fn();
    const news = vi.fn();
    channel.onRefusedEdit(refused);
    const stopNews = channel.onDocumentNews(news);

    postFromAdmin({ ...IMAGE, reason: "not-editable", type: VE_FIELD_EDIT_REFUSED_TYPE });
    postFromAdmin({ ...IMAGE, locale: "en", type: VE_DOCUMENT_SAVED_TYPE });
    postFromAdmin({ patches: [], type: VE_FIELD_PATCH_TYPE });
    stopNews();
    postFromAdmin({ type: VE_DOCUMENT_SAVED_TYPE });

    expect(refused).toHaveBeenCalledWith(IMAGE, "not-editable");
    expect(news.mock.calls).toEqual([
      [
        {
          document: { collectionSlug: "page", docId: "1", kind: "collection", locale: "en" },
          isSave: true,
        },
      ],
      [{ document: null, isSave: false }],
    ]);
  });

  describe("the media API of the admin", () => {
    const LISTING = { ...IMAGE, page: 1, search: "light" };
    const LISTED = { collection: "media", documents: [], hasNextPage: false };
    const file = new File(["pixels"], "lighthouse.jpg", { type: "image/jpeg" });

    const sent = () => admin.postMessage.mock.calls.map(([message]) => message);

    const requestIdOf = (index: number) =>
      (sent()[index] as { requestId: string } | undefined)?.requestId;

    it("asks the admin for the media of a field and takes the answer to that request", async () => {
      const listing = channel.mediaApiOf(adminWindow()).list(LISTING);

      expect(sent()).toEqual([
        { ...LISTING, requestId: expect.any(String), type: VE_MEDIA_OPTIONS_REQUEST_TYPE },
      ]);
      expect(admin.postMessage).toHaveBeenCalledWith(expect.anything(), ADMIN_ORIGIN);

      postFromAdmin({
        answer: LISTED,
        ok: true,
        requestId: requestIdOf(0),
        type: VE_MEDIA_OPTIONS_ANSWER_TYPE,
      });

      await expect(listing).resolves.toEqual({ answer: LISTED, ok: true });
    });

    it("matches each answer to its own request", async () => {
      const api = channel.mediaApiOf(adminWindow());
      const first = api.list(LISTING);
      const second = api.list({ ...LISTING, page: 2 });

      postFromAdmin({
        answer: "second",
        ok: true,
        requestId: requestIdOf(1),
        type: VE_MEDIA_OPTIONS_ANSWER_TYPE,
      });
      postFromAdmin({
        answer: "first",
        ok: true,
        requestId: requestIdOf(0),
        type: VE_MEDIA_OPTIONS_ANSWER_TYPE,
      });

      await expect(first).resolves.toEqual({ answer: "first", ok: true });
      await expect(second).resolves.toEqual({ answer: "second", ok: true });
    });

    it("takes no answer of another kind, from another origin or to a request it already took", async () => {
      const listing = channel.mediaApiOf(adminWindow()).list(LISTING);
      const requestId = requestIdOf(0);

      postFromAdmin({ answer: "upload", ok: true, requestId, type: VE_MEDIA_UPLOAD_ANSWER_TYPE });
      postFromAdmin(
        { answer: "elsewhere", ok: true, requestId, type: VE_MEDIA_OPTIONS_ANSWER_TYPE },
        { origin: "https://evil.example.com" }
      );
      postFromAdmin({ answer: "taken", ok: true, requestId, type: VE_MEDIA_OPTIONS_ANSWER_TYPE });
      postFromAdmin({ answer: "late", ok: true, requestId, type: VE_MEDIA_OPTIONS_ANSWER_TYPE });

      await expect(listing).resolves.toEqual({ answer: "taken", ok: true });
    });

    it("answers no answer once the admin did not answer in time, and takes none after", async () => {
      const listing = channel.mediaApiOf(adminWindow()).list(LISTING);
      const answered = vi.fn();
      void listing.then(answered);

      await vi.advanceTimersByTimeAsync(MEDIA_API_TIME_LIMIT_MS - 1);

      expect(answered).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1);
      postFromAdmin({
        answer: LISTED,
        ok: true,
        requestId: requestIdOf(0),
        type: VE_MEDIA_OPTIONS_ANSWER_TYPE,
      });

      await expect(listing).resolves.toEqual({ answer: null, ok: false });
    });

    it("answers no answer at once when the admin window is closed, and asks it nothing", async () => {
      admin.closed = true;

      await expect(channel.mediaApiOf(adminWindow()).list(LISTING)).resolves.toEqual({
        answer: null,
        ok: false,
      });
      expect(sent()).toEqual([]);
    });

    it("answers no answer soon after the admin window is closed while it waits", async () => {
      const upload = channel.mediaApiOf(adminWindow()).upload(IMAGE, "media", file);

      admin.closed = true;
      await vi.advanceTimersByTimeAsync(CLOSED_ADMIN_CHECK_MS);

      await expect(upload).resolves.toEqual({ answer: null, ok: false });
    });

    it("takes no answer to a request of an earlier channel, as the ids of requests never repeat", async () => {
      void channel.mediaApiOf(adminWindow()).list(LISTING);
      channel.dispose();
      channel = createAdminEditChannel(window, () => ADMIN_ORIGIN);
      const listing = channel.mediaApiOf(adminWindow()).list(LISTING);
      const answered = vi.fn();
      void listing.then(answered);

      postFromAdmin({
        answer: "earlier",
        ok: true,
        requestId: requestIdOf(0),
        type: VE_MEDIA_OPTIONS_ANSWER_TYPE,
      });
      await vi.advanceTimersByTimeAsync(0);

      expect(requestIdOf(1)).not.toBe(requestIdOf(0));
      expect(answered).not.toHaveBeenCalled();
    });

    it("stops waiting for every request once disposed", () => {
      const api = channel.mediaApiOf(adminWindow());
      void api.list(LISTING);
      void api.upload(IMAGE, "media", file);

      channel.dispose();

      expect(vi.getTimerCount()).toBe(0);
    });

    it("sends a file to upload with the field it is for and takes the answer of the admin", async () => {
      const upload = channel.mediaApiOf(adminWindow()).upload(IMAGE, "media", file);

      expect(sent()).toEqual([
        {
          ...IMAGE,
          collection: "media",
          file,
          requestId: expect.any(String),
          type: VE_MEDIA_UPLOAD_TYPE,
        },
      ]);

      const refused = { errors: [{ message: "The file is too large" }] };
      postFromAdmin({
        answer: refused,
        ok: false,
        requestId: requestIdOf(0),
        type: VE_MEDIA_UPLOAD_ANSWER_TYPE,
      });

      await expect(upload).resolves.toEqual({ answer: refused, ok: false });
    });
  });
});
