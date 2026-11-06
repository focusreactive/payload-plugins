import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEntry } from "../../src/components/SeoDrawer/keyphraseState";
import { createRemoteSaver } from "../../src/components/SeoDrawer/remoteSaver";

const target = { apiRoute: "/api", collection: "posts", docId: "1", locale: "en" };
const fetchMock = vi.fn<typeof fetch>(async () => new Response("{}"));

beforeEach(() => {
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

describe("createRemoteSaver", () => {
  it("sends one PUT with the last list after the delay", () => {
    const saver = createRemoteSaver(target, 500);
    saver.schedule([createEntry("a")]);
    saver.schedule([createEntry("ab", ["x"]), createEntry("")]);

    vi.advanceTimersByTime(499);
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
    const saver = createRemoteSaver(target, 500);
    saver.schedule([createEntry("a")]);
    saver.flush();
    vi.advanceTimersByTime(1000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("flush without pending changes sends nothing", () => {
    createRemoteSaver(target, 500).flush();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("save resolves to whether the server accepted the list", async () => {
    const saver = createRemoteSaver(target, 500);
    expect(await saver.save([createEntry("a")])).toBe(true);

    fetchMock.mockResolvedValueOnce(new Response("{}", { status: 403 }));
    expect(await saver.save([createEntry("a")])).toBe(false);

    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(await saver.save([createEntry("a")])).toBe(false);
  });

  it("save asks the server to create only when told to", () => {
    const saver = createRemoteSaver(target, 500);
    saver.save([createEntry("a")], { ifAbsent: true });
    expect(sentBody()).toMatchObject({ ifAbsent: true });

    saver.save([createEntry("a")]);
    expect(sentBody()).not.toHaveProperty("ifAbsent");
  });

  it("save sends right away", () => {
    createRemoteSaver(target, 500).save([createEntry("a")]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
