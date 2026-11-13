import type { Payload } from "payload";
import type { MockInstance } from "vitest";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { LiveRichTextRequest } from "../../src/shared/protocol";
import type { Pages } from "../support/richTextPages";

import { readUnsavedRichText } from "../../src/index";

import { valueAt } from "../support/markedData";
import {
  richText,
  SHORT_TIME_LIMIT_MS,
  SLOW_READ_MS,
  START_TIMEOUT_MS,
  startRealPayload,
} from "../support/realPayload";
import { article, page, readMarked, seedPages, topLevelTypesOf } from "../support/richTextPages";
import { EDITOR, postOf, signIn, streamedPostOf, WRITER } from "../support/unsavedRichTextRequests";
import { waitFor } from "../support/time";

describe("reads of unsaved rich text states for one field", () => {
  let payload: Payload;
  let pages: Pages;
  let editor: Headers;
  let writer: Headers;
  let findByID: Payload["findByID"];
  let documentReads: MockInstance<Payload["findByID"]>;
  let readsInFlight = 0;
  let mostReadsInFlight = 0;
  let readOfPage: (options: Parameters<Payload["findByID"]>[0]) => Promise<unknown>;

  const read = (request: unknown, headers = editor, timeLimitMs?: number) =>
    readUnsavedRichText({ headers, payload, request, timeLimitMs });

  const bodyOf = (
    state: unknown = article(),
    key = "body",
    locale = "en"
  ): LiveRichTextRequest => ({
    field: { ...page(pages.landing), key },
    locale,
    state,
  });

  const pageReads = () =>
    documentReads.mock.calls.filter(([{ collection }]) => collection === "pages").length;

  const slowly = async (options: Parameters<Payload["findByID"]>[0]) => {
    readsInFlight += 1;
    mostReadsInFlight = Math.max(mostReadsInFlight, readsInFlight);
    try {
      await waitFor(SLOW_READ_MS);
      return await findByID(options);
    } finally {
      readsInFlight -= 1;
    }
  };

  const startSlowRead = async (request: unknown = bodyOf()) => {
    const running = read(request);
    await vi.waitFor(() => expect(pageReads()).toBe(1));
    return running;
  };

  beforeAll(async () => {
    payload = await startRealPayload({
      name: "unsaved-rich-text-reads",
      plugin: { instantPreview: true },
    });
    pages = await seedPages(payload);
    editor = await signIn(payload, EDITOR);
    writer = await signIn(payload, WRITER);
    findByID = payload.findByID.bind(payload);
  }, START_TIMEOUT_MS);

  beforeEach(() => {
    readsInFlight = 0;
    mostReadsInFlight = 0;
    readOfPage = slowly;
    documentReads = vi
      .spyOn(payload, "findByID")
      .mockImplementation((options) =>
        options.collection === "pages" ? (readOfPage(options) as never) : findByID(options)
      );
  });

  afterEach(async () => {
    documentReads.mockRestore();
    await waitFor(SLOW_READ_MS);
  });

  afterAll(() => payload.destroy());

  describe("while a read of the same field for the same user is running", () => {
    it("waits for it, then reads the state it was given", async () => {
      const running = startSlowRead();

      const content = await read(bodyOf(richText("Second")));

      expect(topLevelTypesOf(content)).toEqual(["paragraph"]);
      expect(topLevelTypesOf(await running)).toEqual(["paragraph", "paragraph", "list"]);
      expect(mostReadsInFlight).toBe(1);
    });

    it("gives nothing, without reading, to a request a newer one replaced", async () => {
      const running = startSlowRead();
      await vi.waitFor(() => expect(pageReads()).toBe(1));

      const replaced = read(bodyOf(richText("Second")));
      const newest = read(bodyOf(richText("Third")));

      expect(await replaced).toBeNull();
      expect(topLevelTypesOf(await newest)).toEqual(["paragraph"]);
      await running;
      expect(pageReads()).toBe(2);
    });

    it("gives nothing when its own time limit passes first", async () => {
      const running = startSlowRead();
      await vi.waitFor(() => expect(pageReads()).toBe(1));

      expect(await read(bodyOf(), editor, SHORT_TIME_LIMIT_MS)).toBeNull();
      await running;
      expect(pageReads()).toBe(1);
    });

    it("stops waiting when the request is aborted", async () => {
      const running = startSlowRead();
      await vi.waitFor(() => expect(pageReads()).toBe(1));
      const aborted = new AbortController();
      const request = postOf(JSON.stringify(bodyOf()), editor, aborted.signal);

      const answer = readUnsavedRichText({ payload, request });
      aborted.abort();

      expect(await answer).toBeNull();
      await running;
      expect(pageReads()).toBe(1);
    });

    it("reads one row of a list after another row of the same list", async () => {
      const saved = await readMarked(payload, pages.landing);
      const rowId = valueAt(saved, "list.0.id") as string;
      const running = startSlowRead(bodyOf(article(), `list.${rowId}.note`));
      await vi.waitFor(() => expect(pageReads()).toBe(1));

      await read(bodyOf(article(), "list.another-row.note"));
      await running;

      expect(mostReadsInFlight).toBe(1);
    });

    it("reads another field, another locale and for another user at the same time", async () => {
      const running = startSlowRead();
      await vi.waitFor(() => expect(pageReads()).toBe(1));

      await Promise.all([
        read(bodyOf(article(), "localizedBody")),
        read(bodyOf(article(), "body", "de")),
        read(bodyOf(), writer),
      ]);
      await running;

      expect(mostReadsInFlight).toBe(4);
    });
  });

  it("reads again once a read that does not finish is stale", async () => {
    readOfPage = () => new Promise(() => undefined);
    expect(await read(bodyOf(), editor, SHORT_TIME_LIMIT_MS)).toBeNull();
    readOfPage = findByID;

    await waitFor(SHORT_TIME_LIMIT_MS * 3);

    expect(await read(bodyOf(), editor, SHORT_TIME_LIMIT_MS)).not.toBeNull();
  });

  it.each(["nope", "label", "list.some-row.label", "body.extra"])(
    "reads nothing for the key %s, which names no rich text field",
    async (key) => {
      expect(await read(bodyOf(article(), key))).toBeNull();
      expect(pageReads()).toBe(0);
    }
  );

  describe("logs no error and gives nothing", () => {
    let logged: MockInstance;

    beforeEach(() => {
      logged = vi.spyOn(payload.logger, "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
      logged.mockRestore();
    });

    it("when the body of a request breaks off", async () => {
      const body = new ReadableStream<Uint8Array>({
        start: (controller) => controller.error(new Error("The client went away")),
      });
      const request = streamedPostOf(body, editor);

      expect(await readUnsavedRichText({ payload, request })).toBeNull();
      expect(logged).not.toHaveBeenCalled();
    });

    it("when signing in fails", async () => {
      const signIns = vi.spyOn(payload, "auth").mockRejectedValue(new Error("No database"));

      expect(await read(bodyOf())).toBeNull();
      expect(logged).not.toHaveBeenCalled();
      signIns.mockRestore();
    });
  });
});
