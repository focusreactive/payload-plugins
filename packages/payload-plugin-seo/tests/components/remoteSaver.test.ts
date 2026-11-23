// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEntry } from "../../src/components/SeoDrawer/keyphraseState";
import { unsavedStorageKey } from "../../src/components/SeoDrawer/keyphraseStorage";
import { createRemoteSaver } from "../../src/components/SeoDrawer/remoteSaver";
import { KEYPHRASE_SAVE_DELAY_MS } from "../../src/constants";

const target = { apiRoute: "/api", collection: "posts", docId: "1", locale: "en" };
const backupKey = unsavedStorageKey("posts", "1", "en");
const fetchMock = vi.fn<typeof fetch>(async () => new Response("{}"));

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function sentBody(): unknown {
  const init = fetchMock.mock.calls.at(-1)?.[1];
  return JSON.parse(init?.body as string);
}

function sentTexts(): string[] {
  return fetchMock.mock.calls.map(([, init]) =>
    JSON.parse(init?.body as string)
      .keyphrases.map((k: { text: string }) => k.text)
      .join(",")
  );
}

function deferredResponse() {
  let respond: ((res: Response) => void) | undefined;
  const promise = new Promise<Response>((resolve) => {
    respond = resolve;
  });
  return { promise, respond };
}

describe("createRemoteSaver", () => {
  it("sends one PUT with the last list after the delay", () => {
    const saver = createRemoteSaver(target);
    saver.schedule([createEntry("a")]);
    saver.schedule([createEntry("ab", ["x"]), createEntry("")]);

    vi.advanceTimersByTime(KEYPHRASE_SAVE_DELAY_MS - 1);
    expect(fetchMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/seo/keyphrases");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: "PUT",
      credentials: "include",
      keepalive: true,
    });
    expect(sentBody()).toEqual({
      collection: "posts",
      docId: "1",
      locale: "en",
      keyphrases: [{ text: "ab", synonyms: ["x"] }],
    });
  });

  it("flush sends the pending list immediately and only once", () => {
    const saver = createRemoteSaver(target);
    saver.schedule([createEntry("a")]);
    saver.flush();
    vi.advanceTimersByTime(KEYPHRASE_SAVE_DELAY_MS * 2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("flush without pending changes sends nothing", () => {
    createRemoteSaver(target).flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("save resolves to the outcome of the request", async () => {
    const saver = createRemoteSaver(target);
    expect(await saver.save([createEntry("a")])).toEqual({ status: "saved" });

    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 403 }));
    expect(await saver.save([createEntry("a")])).toEqual({ status: "failed" });

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(await saver.save([createEntry("a")])).toEqual({ status: "failed" });
  });

  it("save returns the stored keyphrases when the server already has a row", async () => {
    fetchMock.mockResolvedValueOnce(
      Response.json({ keyphrases: [{ text: "server", synonyms: [] }] }, { status: 409 })
    );
    const outcome = await createRemoteSaver(target).save([createEntry("a")], { ifAbsent: true });
    expect(outcome).toEqual({ status: "exists", keyphrases: [{ text: "server", synonyms: [] }] });
  });

  it("reports every outcome", async () => {
    const onOutcome = vi.fn();
    const saver = createRemoteSaver(target, { onOutcome });
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    await saver.save([createEntry("a")]);
    await saver.save([createEntry("a")]);
    expect(onOutcome.mock.calls).toEqual([[{ status: "failed" }], [{ status: "saved" }]]);
  });

  it("sends a list that failed to save again on the next flush", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const saver = createRemoteSaver(target);
    saver.schedule([createEntry("a")]);
    await saver.flush();
    await saver.flush();
    expect(sentTexts()).toEqual(["a", "a"]);
  });

  it("drops a failed list once a newer list is scheduled", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const saver = createRemoteSaver(target);
    saver.schedule([createEntry("a")]);
    await saver.flush();

    saver.schedule([createEntry("b")]);
    await saver.flush();
    await saver.flush();
    expect(sentTexts()).toEqual(["a", "b"]);
  });

  it("waits for the save in flight before sending the next one", async () => {
    const first = deferredResponse();
    fetchMock.mockReturnValueOnce(first.promise);
    const saver = createRemoteSaver(target);
    const saves = [saver.save([createEntry("a")]), saver.save([createEntry("b")])];
    expect(sentTexts()).toEqual(["a"]);

    first.respond?.(new Response("{}"));
    await Promise.all(saves);
    expect(sentTexts()).toEqual(["a", "b"]);
  });

  it("keeps a browser backup of a scheduled list until it is saved", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    const saver = createRemoteSaver(target);
    saver.schedule([createEntry("a")]);
    expect(localStorage.getItem(backupKey)).toContain('"a"');

    await saver.flush();
    expect(localStorage.getItem(backupKey)).toContain('"a"');

    await saver.flush();
    expect(localStorage.getItem(backupKey)).toBeNull();
  });

  it("save asks the server to create only when told to", async () => {
    const saver = createRemoteSaver(target);
    await saver.save([createEntry("a")], { ifAbsent: true });
    expect(sentBody()).toMatchObject({ ifAbsent: true });

    await saver.save([createEntry("a")]);
    expect(sentBody()).not.toHaveProperty("ifAbsent");
  });

  it("save sends right away", () => {
    createRemoteSaver(target).save([createEntry("a")]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
