// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KEYPHRASE_SAVE_DELAY_MS } from "../../src/constants";
import { createEntry } from "../../src/components/SeoDrawer/keyphraseState";
import {
  saveKeyphrases,
  storageKey,
  unsavedStorageKey,
} from "../../src/components/SeoDrawer/keyphraseStorage";
import { useKeyphrases } from "../../src/components/SeoDrawer/useKeyphrases";

const fetchMock = vi.fn<typeof fetch>(async () => new Response("{}"));
const base = { collectionSlug: "posts", docId: "1", localeCode: "en" };
const serverList = [{ text: "server", synonyms: [] }];
const localKey = storageKey("posts", "1", "en");
const unsavedKey = unsavedStorageKey("posts", "1", "en");
const editable = { apiRoute: "/api", initial: serverList, indexed: true, canUpdate: true };

const texts = (list: { text: string }[]) => list.map((k) => k.text);

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function sentBody(): unknown {
  const init = fetchMock.mock.calls.at(-1)?.[1];
  return JSON.parse(init?.body as string);
}

describe("useKeyphrases with a remote index", () => {
  it("starts from the server list", () => {
    const { result } = renderHook(() =>
      useKeyphrases({
        ...base,
        remote: { apiRoute: "/api", initial: serverList, indexed: true, canUpdate: true },
      })
    );
    expect(result.current.keyphrases.map((k) => k.text)).toEqual(["server"]);
  });

  it("falls back to the browser list when the server has none and uploads it once on open", () => {
    saveKeyphrases(storageKey("posts", "1", "en"), [createEntry("local")]);
    const { result } = renderHook(() =>
      useKeyphrases({
        ...base,
        remote: { apiRoute: "/api", initial: [], indexed: false, canUpdate: true },
      })
    );

    expect(result.current.keyphrases[0].text).toBe("local");
    act(() => result.current.syncOnOpen());
    act(() => result.current.syncOnOpen());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentBody()).toMatchObject({
      ifAbsent: true,
      keyphrases: [{ text: "local", synonyms: [] }],
    });
  });

  it("removes the browser copy after uploading it", async () => {
    saveKeyphrases(localKey, [createEntry("local")]);
    const { result } = renderHook(() =>
      useKeyphrases({
        ...base,
        remote: { apiRoute: "/api", initial: [], indexed: false, canUpdate: true },
      })
    );

    await act(async () => result.current.syncOnOpen());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(localKey)).toBeNull();
  });

  it("keeps the browser copy when the upload is rejected", async () => {
    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 403 }));
    saveKeyphrases(localKey, [createEntry("local")]);
    const { result } = renderHook(() =>
      useKeyphrases({
        ...base,
        remote: { apiRoute: "/api", initial: [], indexed: false, canUpdate: true },
      })
    );

    await act(async () => result.current.syncOnOpen());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(localKey)).not.toBeNull();
  });

  describe("without update access", () => {
    const readOnly = { apiRoute: "/api", initial: serverList, indexed: true, canUpdate: false };

    it("ignores a list that was never saved", () => {
      saveKeyphrases(unsavedKey, [createEntry("unsaved")]);
      const { result } = renderHook(() => useKeyphrases({ ...base, remote: readOnly }));
      expect(texts(result.current.keyphrases)).toEqual(["server"]);
    });

    it("starts from the server list and keeps edits in memory only", () => {
      const { result, unmount } = renderHook(() => useKeyphrases({ ...base, remote: readOnly }));
      expect(result.current.keyphrases.map((k) => k.text)).toEqual(["server"]);

      act(() => result.current.updateText(result.current.keyphrases[0].id, "edited"));
      expect(result.current.keyphrases[0].text).toBe("edited");
      act(() => vi.advanceTimersByTime(KEYPHRASE_SAVE_DELAY_MS));
      unmount();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(localStorage.getItem(localKey)).toBeNull();
    });

    it("neither uploads nor clears the browser copy on open", async () => {
      saveKeyphrases(localKey, [createEntry("local")]);
      const { result } = renderHook(() =>
        useKeyphrases({ ...base, remote: { ...readOnly, initial: [], indexed: false } })
      );

      expect(result.current.keyphrases[0].text).toBe("local");
      await act(async () => result.current.syncOnOpen());
      expect(fetchMock).not.toHaveBeenCalled();
      expect(localStorage.getItem(localKey)).not.toBeNull();
    });
  });

  it("ignores the browser copy when the server row exists but is empty", () => {
    saveKeyphrases(localKey, [createEntry("deleted elsewhere")]);
    const { result } = renderHook(() =>
      useKeyphrases({
        ...base,
        remote: { apiRoute: "/api", initial: [], indexed: true, canUpdate: true },
      })
    );

    expect(result.current.keyphrases.map((k) => k.text)).toEqual([""]);
    act(() => result.current.syncOnOpen());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps no browser copy once the edits are saved", async () => {
    const { result, unmount } = renderHook(() => useKeyphrases({ ...base, remote: editable }));
    act(() => result.current.updateText(result.current.keyphrases[0].id, "edited"));
    act(() => result.current.addRelated());
    unmount();
    await vi.waitFor(() => expect(localStorage.length).toBe(0));
  });

  it("adopts the server list when the server already had keyphrases for the upload", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ keyphrases: serverList }, { status: 409 }));
    saveKeyphrases(localKey, [createEntry("local")]);
    const { result } = renderHook(() =>
      useKeyphrases({
        ...base,
        remote: { apiRoute: "/api", initial: [], indexed: false, canUpdate: true },
      })
    );

    await act(async () => result.current.syncOnOpen());
    expect(texts(result.current.keyphrases)).toEqual(["server"]);
    expect(localStorage.getItem(localKey)).toBeNull();
  });

  it("keeps an edit made while the upload was in flight", async () => {
    let answer: ((res: Response) => void) | undefined;
    fetchMock.mockReturnValueOnce(
      new Promise((resolve) => {
        answer = resolve;
      })
    );
    saveKeyphrases(localKey, [createEntry("local")]);
    const { result, unmount } = renderHook(() =>
      useKeyphrases({
        ...base,
        remote: { apiRoute: "/api", initial: [], indexed: false, canUpdate: true },
      })
    );

    act(() => result.current.syncOnOpen());
    act(() => result.current.updateText(result.current.keyphrases[0].id, "edited"));
    await act(async () => answer?.(Response.json({ keyphrases: serverList }, { status: 409 })));
    expect(texts(result.current.keyphrases)).toEqual(["edited"]);
    unmount();
  });

  it("reports a failed save until a later save succeeds", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useKeyphrases({ ...base, remote: editable }));
    expect(result.current.saveFailed).toBe(false);

    act(() => result.current.updateText(result.current.keyphrases[0].id, "a"));
    await act(() => vi.advanceTimersByTimeAsync(KEYPHRASE_SAVE_DELAY_MS));
    expect(result.current.saveFailed).toBe(true);

    act(() => result.current.updateText(result.current.keyphrases[0].id, "ab"));
    await act(() => vi.advanceTimersByTimeAsync(KEYPHRASE_SAVE_DELAY_MS));
    expect(result.current.saveFailed).toBe(false);
  });

  it("restores a list that was never saved and saves it on open", async () => {
    saveKeyphrases(unsavedKey, [createEntry("unsaved")]);
    const { result } = renderHook(() => useKeyphrases({ ...base, remote: editable }));
    expect(texts(result.current.keyphrases)).toEqual(["unsaved"]);

    await act(async () => result.current.syncOnOpen());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentBody()).toEqual({
      collection: "posts",
      docId: "1",
      locale: "en",
      keyphrases: [{ text: "unsaved", synonyms: [] }],
    });
    expect(localStorage.getItem(unsavedKey)).toBeNull();
  });

  it("does not upload on open when the server already had keyphrases", () => {
    const { result } = renderHook(() =>
      useKeyphrases({
        ...base,
        remote: { apiRoute: "/api", initial: serverList, indexed: true, canUpdate: true },
      })
    );
    act(() => result.current.syncOnOpen());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uploads only the edited list when an edit lands before the first open", () => {
    saveKeyphrases(storageKey("posts", "1", "en"), [createEntry("local")]);
    const { result } = renderHook(() =>
      useKeyphrases({
        ...base,
        remote: { apiRoute: "/api", initial: [], indexed: false, canUpdate: true },
      })
    );

    act(() => result.current.updateText(result.current.keyphrases[0].id, "edited"));
    act(() => result.current.syncOnOpen());
    act(() => vi.advanceTimersByTime(KEYPHRASE_SAVE_DELAY_MS));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentBody()).toMatchObject({ keyphrases: [{ text: "edited", synonyms: [] }] });
  });

  it("does not upload on open when both the server and the browser are empty", () => {
    const { result } = renderHook(() =>
      useKeyphrases({
        ...base,
        remote: { apiRoute: "/api", initial: [], indexed: false, canUpdate: true },
      })
    );
    act(() => result.current.syncOnOpen());
    act(() => vi.advanceTimersByTime(KEYPHRASE_SAVE_DELAY_MS));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves a pending edit to the previous document when the document changes", () => {
    const remote = { apiRoute: "/api", initial: [], indexed: false, canUpdate: true };
    const { result, rerender } = renderHook((args) => useKeyphrases(args), {
      initialProps: { ...base, remote },
    });
    act(() => result.current.updateText(result.current.keyphrases[0].id, "pa"));

    rerender({ ...base, docId: "2", remote });
    act(() => vi.advanceTimersByTime(KEYPHRASE_SAVE_DELAY_MS));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]?.method).toBe("PUT");
    expect(sentBody()).toMatchObject({ docId: "1", keyphrases: [{ text: "pa", synonyms: [] }] });
  });

  it("saves edits after the debounce", () => {
    const { result } = renderHook(() =>
      useKeyphrases({
        ...base,
        remote: { apiRoute: "/api", initial: [], indexed: false, canUpdate: true },
      })
    );
    act(() => result.current.updateText(result.current.keyphrases[0].id, "pa"));
    expect(fetchMock).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(KEYPHRASE_SAVE_DELAY_MS));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentBody()).toMatchObject({ keyphrases: [{ text: "pa", synonyms: [] }] });
  });

  it("flushes the pending edit on unmount", () => {
    const { result, unmount } = renderHook(() =>
      useKeyphrases({
        ...base,
        remote: { apiRoute: "/api", initial: [], indexed: false, canUpdate: true },
      })
    );
    act(() => result.current.updateText(result.current.keyphrases[0].id, "p"));
    act(() => result.current.updateText(result.current.keyphrases[0].id, "pa"));
    expect(fetchMock).not.toHaveBeenCalled();

    unmount();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentBody()).toMatchObject({ keyphrases: [{ text: "pa", synonyms: [] }] });
  });

  it("flushes the pending edit when the page is hidden or unloaded", async () => {
    const { result } = renderHook(() =>
      useKeyphrases({
        ...base,
        remote: { apiRoute: "/api", initial: [], indexed: false, canUpdate: true },
      })
    );
    act(() => result.current.updateText(result.current.keyphrases[0].id, "pa"));
    await act(async () => window.dispatchEvent(new Event("pagehide")));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(sentBody()).toMatchObject({ keyphrases: [{ text: "pa", synonyms: [] }] });

    act(() => result.current.updateText(result.current.keyphrases[0].id, "pay"));
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentBody()).toMatchObject({ keyphrases: [{ text: "pay", synonyms: [] }] });
  });

  it("does not flush when the page becomes visible", () => {
    const { result } = renderHook(() =>
      useKeyphrases({
        ...base,
        remote: { apiRoute: "/api", initial: [], indexed: false, canUpdate: true },
      })
    );
    act(() => result.current.updateText(result.current.keyphrases[0].id, "pa"));
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never calls the server without a remote index", () => {
    const { result } = renderHook(() => useKeyphrases(base));
    act(() => result.current.updateText(result.current.keyphrases[0].id, "x"));
    act(() => result.current.syncOnOpen());
    act(() => vi.advanceTimersByTime(KEYPHRASE_SAVE_DELAY_MS));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
