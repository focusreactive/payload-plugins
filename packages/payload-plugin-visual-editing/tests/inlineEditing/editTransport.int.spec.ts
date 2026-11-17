import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EditTransport } from "../../src/client/inlineEditing/editTransport";

import {
  createEditTransport,
  EDIT_SAVE_PAUSE_MS,
  EDIT_SEND_PAUSE_MS,
  KEEPALIVE_BODY_LIMIT,
} from "../../src/client/inlineEditing/editTransport";
import { VE_FIELD_EDIT_TYPE, VE_RICH_TEXT_EDIT_TYPE } from "../../src/shared/protocol";

import { editorState, paragraph, textNode } from "../support/editorState";

import { ADMIN_ORIGIN, restorePreviewWindow, stubAdminWindow } from "../support/previewWindow";

const PAYLOAD_API = "https://cms.example.com/api";

const TITLE = { collectionSlug: "page", docId: "1", key: "title", kind: "collection" } as const;

const BODY = { ...TITLE, key: "body" };

const STATE = editorState(paragraph(textNode("Hello")));

const onEdited = vi.fn();

const ctx = { adminOrigin: ADMIN_ORIGIN, onEdited, payloadApi: PAYLOAD_API };

const answerOf = (saved: boolean, ok = true) =>
  ({ json: () => Promise.resolve({ saved }), ok }) as Response;

describe("the transport of an edit", () => {
  let transport: EditTransport;
  let statuses: string[];
  let fetchEndpoint: ReturnType<typeof vi.fn>;

  const start = () => {
    transport = createEditTransport(
      () => ctx,
      (status) => statuses.push(status)
    );
  };

  const settle = () => vi.advanceTimersByTimeAsync(0);

  beforeEach(() => {
    vi.useFakeTimers();
    statuses = [];
    onEdited.mockClear();
    fetchEndpoint = vi.fn(() => Promise.resolve(answerOf(true)));
    vi.stubGlobal("fetch", fetchEndpoint);
  });

  afterEach(() => {
    transport.dispose();
    restorePreviewWindow();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  describe("of a page next to the admin", () => {
    const postToAdmin = vi.fn();

    beforeEach(() => {
      postToAdmin.mockClear();
      stubAdminWindow({ postMessage: postToAdmin });
      start();
    });

    it("posts the latest value to the admin once the editor pauses", () => {
      transport.send({ ...TITLE, value: "H" });
      transport.send({ ...TITLE, value: "Hello" });
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS - 1);
      expect(postToAdmin).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);

      expect(postToAdmin).toHaveBeenCalledTimes(1);
      expect(postToAdmin).toHaveBeenCalledWith(
        { ...TITLE, type: VE_FIELD_EDIT_TYPE, value: "Hello" },
        ADMIN_ORIGIN
      );
      expect(fetchEndpoint).not.toHaveBeenCalled();
    });

    it("posts an edited rich text state as a message of its own", () => {
      transport.send({ ...BODY, state: STATE });
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

      expect(postToAdmin).toHaveBeenCalledWith(
        { ...BODY, state: STATE, type: VE_RICH_TEXT_EDIT_TYPE },
        ADMIN_ORIGIN
      );
      expect(onEdited).not.toHaveBeenCalled();
    });

    it("keeps the edits of two fields apart", () => {
      transport.send({ ...TITLE, value: "Title" });
      transport.send({ ...TITLE, key: "lead", value: "Lead" });

      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

      expect(postToAdmin.mock.calls.map(([message]) => (message as { key: string }).key)).toEqual([
        "title",
        "lead",
      ]);
    });

    it("posts at once when the edit ends", () => {
      transport.send({ ...TITLE, value: "Hello" });

      transport.flush();

      expect(postToAdmin).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);
      expect(postToAdmin).toHaveBeenCalledTimes(1);
    });

    it("says an edit the form refused is not saved, and posts it again when asked", () => {
      transport.send({ ...TITLE, value: "Hello" });
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

      transport.refuse(TITLE);
      transport.retry();

      expect(statuses).toEqual(["unsaved", "failed"]);
      expect(postToAdmin).toHaveBeenCalledTimes(2);
    });

    it("says the edits are saved when the admin saved the document", () => {
      transport.send({ ...TITLE, value: "Hello" });
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

      transport.settle({ ...TITLE, locale: "en" });

      expect(statuses).toEqual(["unsaved", "saved"]);
    });

    it("stays unsaved when the admin saved another document", () => {
      transport.send({ ...TITLE, value: "Hello" });
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

      transport.settle({ ...TITLE, docId: "2" });

      expect(statuses).toEqual(["unsaved"]);
    });

    it("counts a save that names no document as a save of every edit", () => {
      transport.send({ ...TITLE, value: "Hello" });
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

      transport.settle(null);

      expect(statuses).toEqual(["unsaved", "saved"]);
    });

    it("counts a pick the form holds as unsaved until the admin saved its document", () => {
      transport.holdInForm({ ...TITLE, key: "image" });
      expect(statuses).toEqual(["unsaved"]);

      transport.settle({ ...TITLE, docId: "2" });
      expect(statuses).toEqual(["unsaved"]);

      transport.settle({ ...TITLE });
      expect(statuses).toEqual(["unsaved", "saved"]);
      expect(postToAdmin).not.toHaveBeenCalled();
    });

    it("ignores a refusal of an edit it did not post", () => {
      transport.refuse(TITLE);

      expect(statuses).toEqual([]);
    });

    it("says the value is unsaved, because the form holds it", () => {
      transport.send({ ...TITLE, value: "Hello" });
      vi.advanceTimersByTime(EDIT_SEND_PAUSE_MS);

      expect(statuses).toEqual(["unsaved"]);
    });
  });

  describe("of a page on its own", () => {
    beforeEach(start);

    it("posts the value to the endpoint with the session of the editor", async () => {
      transport.send({ ...TITLE, locale: "en", value: "Hello" });

      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      expect(fetchEndpoint).toHaveBeenCalledWith(`${PAYLOAD_API}/visual-editing/field-edit`, {
        body: JSON.stringify({ ...TITLE, locale: "en", value: "Hello" }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        method: "POST",
      });
      expect(statuses).toEqual(["unsaved", "saving", "saved"]);
    });

    it("posts an edited rich text state to the same endpoint and says when it is saved", async () => {
      transport.send({ ...BODY, state: STATE });
      expect(transport.isUnsaved(BODY)).toBe(true);

      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      const [url, init] = fetchEndpoint.mock.calls[0] as [string, RequestInit];
      expect(url).toBe(`${PAYLOAD_API}/visual-editing/field-edit`);
      expect(JSON.parse(init.body as string)).toEqual({ ...BODY, state: STATE });
      expect(init.keepalive).toBe(true);
      expect(onEdited).toHaveBeenCalledTimes(1);
      expect(transport.isUnsaved(BODY)).toBe(false);
    });

    it("does not ask the browser to keep a request alive that is too long for it", async () => {
      const long = editorState(paragraph(textNode("a".repeat(KEEPALIVE_BODY_LIMIT))));

      transport.sendNow({ ...BODY, state: long });
      await settle();

      const [, init] = fetchEndpoint.mock.calls[0] as [string, RequestInit];
      expect(init.keepalive).toBe(false);
    });

    it("counts an edit the endpoint refused as unsaved and tells no one that it was saved", async () => {
      fetchEndpoint.mockImplementationOnce(() => Promise.resolve(answerOf(false)));

      transport.sendNow({ ...BODY, state: STATE });
      await settle();

      expect(transport.isUnsaved(BODY)).toBe(true);
      expect(onEdited).not.toHaveBeenCalled();
    });

    it("saves one edit after the other", async () => {
      const answers: ((answer: Response) => void)[] = [];
      fetchEndpoint.mockImplementationOnce(
        () => new Promise<Response>((resolve) => answers.push(resolve))
      );
      transport.send({ ...TITLE, value: "First" });
      transport.flush();
      transport.send({ ...TITLE, value: "Second" });
      transport.flush();
      await settle();
      expect(fetchEndpoint).toHaveBeenCalledTimes(1);

      answers[0]?.(answerOf(true));
      await settle();

      expect(fetchEndpoint).toHaveBeenCalledTimes(2);
    });

    it.each([
      ["refuses the edit", () => Promise.resolve(answerOf(false))],
      ["answers an error", () => Promise.resolve(answerOf(true, false))],
      ["cannot be reached", () => Promise.reject(new Error("offline"))],
    ])("says the value is not saved when the endpoint %s", async (_name, answer) => {
      fetchEndpoint.mockImplementationOnce(answer);
      transport.send({ ...TITLE, value: "Hello" });

      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      expect(statuses).toEqual(["unsaved", "saving", "failed"]);
    });

    it("sends the edit that failed again when asked to", async () => {
      fetchEndpoint.mockImplementationOnce(() => Promise.resolve(answerOf(false)));
      transport.send({ ...TITLE, value: "Hello" });
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      transport.retry();
      await settle();

      expect(fetchEndpoint).toHaveBeenCalledTimes(2);
      expect(statuses.at(-1)).toBe("saved");
    });

    it("keeps saying an edit is not saved while another field saves", async () => {
      fetchEndpoint.mockImplementationOnce(() => Promise.resolve(answerOf(false)));
      transport.send({ ...TITLE, value: "Title" });
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      transport.send({ ...TITLE, key: "lead", value: "Lead" });
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      expect(statuses.at(-1)).toBe("failed");
    });

    it("sends every edit that failed again", async () => {
      fetchEndpoint.mockImplementation(() => Promise.resolve(answerOf(false)));
      transport.send({ ...TITLE, value: "Title" });
      transport.send({ ...TITLE, key: "lead", value: "Lead" });
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
      transport.send({ ...TITLE, value: "First" });
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      transport.send({ ...TITLE, value: "Second" });
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      expect(statuses.at(-1)).toBe("saved");
    });

    it("has nothing to send again after a save", async () => {
      transport.send({ ...TITLE, value: "Hello" });
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);

      transport.retry();
      await settle();

      expect(fetchEndpoint).toHaveBeenCalledTimes(1);
    });

    it("holds an edit unsaved for as long as it takes, and saves it when the edit ends", async () => {
      transport.hold({ ...BODY, state: STATE });
      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS * 10);

      expect(fetchEndpoint).not.toHaveBeenCalled();
      expect(statuses).toEqual(["unsaved"]);
      expect(transport.isUnsaved(BODY)).toBe(true);

      transport.flush();
      await settle();

      expect(fetchEndpoint).toHaveBeenCalledTimes(1);
      expect(statuses.at(-1)).toBe("saved");
      expect(transport.isUnsaved(BODY)).toBe(false);
    });

    it("drops an edit it holds without saving it", async () => {
      transport.hold({ ...BODY, state: STATE });

      transport.drop(BODY);
      transport.flush();
      await settle();

      expect(fetchEndpoint).not.toHaveBeenCalled();
      expect(statuses).toEqual(["unsaved", "saved"]);
      expect(transport.isUnsaved(BODY)).toBe(false);
    });

    it("keeps saying that changes are unsaved when it drops one edit while another waits", () => {
      transport.send({ ...TITLE, value: "Hello" });
      transport.hold({ ...BODY, state: STATE });

      transport.drop(BODY);

      expect(statuses.at(-1)).toBe("unsaved");
    });

    it("delivers one edit at once and leaves the waiting ones waiting", async () => {
      transport.send({ ...TITLE, value: "Hello" });

      transport.sendNow({ ...TITLE, key: "image", value: "9" });
      await settle();

      expect(fetchEndpoint).toHaveBeenCalledTimes(1);
      expect(JSON.parse(fetchEndpoint.mock.calls[0]![1].body as string)).toMatchObject({
        key: "image",
      });

      await vi.advanceTimersByTimeAsync(EDIT_SAVE_PAUSE_MS);
      expect(fetchEndpoint).toHaveBeenCalledTimes(2);
    });

    it("tells the sender of an edit delivered at once how each save of it ended", async () => {
      const outcomes: boolean[] = [];
      fetchEndpoint.mockImplementationOnce(() => Promise.resolve(answerOf(false)));

      transport.sendNow({ ...TITLE, key: "image", value: "9" }, (isSaved) =>
        outcomes.push(isSaved)
      );
      await settle();
      expect(outcomes).toEqual([false]);

      transport.retry();
      await settle();
      expect(outcomes).toEqual([false, true]);
    });

    it("sends what is waiting when it is disposed and reports nothing after", async () => {
      transport.send({ ...TITLE, value: "Hello" });

      transport.dispose();
      await settle();

      expect(fetchEndpoint).toHaveBeenCalledTimes(1);
      expect(statuses).toEqual(["unsaved"]);
    });
  });
});
