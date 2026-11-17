import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EditTransport } from "../../src/client/inlineEditing/editTransport";

import {
  createEditTransport,
  EDIT_SEND_PAUSE_MS,
} from "../../src/client/inlineEditing/editTransport";
import { VE_FIELD_EDIT_TYPE } from "../../src/shared/protocol";

import { ADMIN_ORIGIN, restorePreviewWindow, stubAdminWindow } from "../support/previewWindow";

const PAYLOAD_API = "https://cms.example.com/api";

const TITLE = { collectionSlug: "page", docId: "1", key: "title", kind: "collection" } as const;

const ctx = { adminOrigin: ADMIN_ORIGIN, payloadApi: PAYLOAD_API };

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

      transport.settle();

      expect(statuses).toEqual(["unsaved", "saved"]);
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

      await vi.advanceTimersByTimeAsync(EDIT_SEND_PAUSE_MS);

      expect(fetchEndpoint).toHaveBeenCalledWith(`${PAYLOAD_API}/visual-editing/field-edit`, {
        body: JSON.stringify({ ...TITLE, locale: "en", value: "Hello" }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        method: "POST",
      });
      expect(statuses).toEqual(["unsaved", "saving", "saved"]);
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

      await vi.advanceTimersByTimeAsync(EDIT_SEND_PAUSE_MS);

      expect(statuses).toEqual(["unsaved", "saving", "failed"]);
    });

    it("sends the edit that failed again when asked to", async () => {
      fetchEndpoint.mockImplementationOnce(() => Promise.resolve(answerOf(false)));
      transport.send({ ...TITLE, value: "Hello" });
      await vi.advanceTimersByTimeAsync(EDIT_SEND_PAUSE_MS);

      transport.retry();
      await settle();

      expect(fetchEndpoint).toHaveBeenCalledTimes(2);
      expect(statuses.at(-1)).toBe("saved");
    });

    it("keeps saying an edit is not saved while another field saves", async () => {
      fetchEndpoint.mockImplementationOnce(() => Promise.resolve(answerOf(false)));
      transport.send({ ...TITLE, value: "Title" });
      await vi.advanceTimersByTimeAsync(EDIT_SEND_PAUSE_MS);

      transport.send({ ...TITLE, key: "lead", value: "Lead" });
      await vi.advanceTimersByTimeAsync(EDIT_SEND_PAUSE_MS);

      expect(statuses.at(-1)).toBe("failed");
    });

    it("sends every edit that failed again", async () => {
      fetchEndpoint.mockImplementation(() => Promise.resolve(answerOf(false)));
      transport.send({ ...TITLE, value: "Title" });
      transport.send({ ...TITLE, key: "lead", value: "Lead" });
      await vi.advanceTimersByTimeAsync(EDIT_SEND_PAUSE_MS);
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
      await vi.advanceTimersByTimeAsync(EDIT_SEND_PAUSE_MS);

      transport.send({ ...TITLE, value: "Second" });
      await vi.advanceTimersByTimeAsync(EDIT_SEND_PAUSE_MS);

      expect(statuses.at(-1)).toBe("saved");
    });

    it("has nothing to send again after a save", async () => {
      transport.send({ ...TITLE, value: "Hello" });
      await vi.advanceTimersByTimeAsync(EDIT_SEND_PAUSE_MS);

      transport.retry();
      await settle();

      expect(fetchEndpoint).toHaveBeenCalledTimes(1);
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
