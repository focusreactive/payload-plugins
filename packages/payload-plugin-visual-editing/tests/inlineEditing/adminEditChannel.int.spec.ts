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
  createAdminEditChannel,
  MEDIA_PICK_TIME_LIMIT_MS,
  RICH_TEXT_STATE_TIME_LIMIT_MS,
} from "../../src/client/inlineEditing/adminEditChannel";
import {
  VE_DOCUMENT_SAVED_TYPE,
  VE_FIELD_EDIT_REFUSED_TYPE,
  VE_FIELD_EDIT_TYPE,
  VE_FIELD_PATCH_TYPE,
  VE_MEDIA_PICK_CANCELLED_TYPE,
  VE_MEDIA_PICKED_TYPE,
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
});
