import type { Payload, PayloadRequest } from "payload";

import { createLocalReq } from "payload";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  EditStatus,
  EditTransport,
  FieldEdit,
} from "../../src/client/inlineEditing/editTransport";

import { createEditRoutes } from "../../src/client/inlineEditing/editRoutes";
import {
  createEditTransport,
  EDIT_SAVE_PAUSE_MS,
} from "../../src/client/inlineEditing/editTransport";
import { VE_FIELD_EDIT_PATH } from "../../src/shared/protocol";

import { START_TIMEOUT_MS, startRealPayload } from "../support/realPayload";
import { page } from "../support/richTextPages";
import { EDITOR, signIn } from "../support/unsavedRichTextRequests";

const SAVE_TIME_LIMIT_MS = 5000;

const TIMERS_OF_THE_PAUSE = ["setTimeout", "clearTimeout"] as const;

describe("the versions edits on a page of its own add", () => {
  let payload: Payload;
  let editor: Headers;
  let transport: EditTransport;
  let statuses: EditStatus[];

  const postToEndpoint = async (_url: string, init: RequestInit): Promise<Response> => {
    const endpoint = payload.config.endpoints.find(({ path }) => path === VE_FIELD_EDIT_PATH);
    const { user } = await payload.auth({ headers: editor });
    const sent = new Headers(editor);
    sent.set("Content-Type", "application/json");
    const req = await createLocalReq(
      { req: { headers: sent } as Partial<PayloadRequest>, user: user ?? undefined },
      payload
    );
    req.text = async () => init.body as string;
    return (await endpoint!.handler(req)) as Response;
  };

  const pageWindow = {
    addEventListener: () => undefined,
    fetch: postToEndpoint,
    removeEventListener: () => undefined,
  } as unknown as Window;

  const versionsOf = async (docId: string) =>
    (await payload.countVersions({ collection: "pages", where: { parent: { equals: docId } } }))
      .totalDocs;

  const untilSaved = () =>
    vi.waitFor(() => expect(statuses.at(-1)).toBe("saved"), { timeout: SAVE_TIME_LIMIT_MS });

  const beginEdit = (docId: string) =>
    transport.beginEdit({ ...page(docId), key: "label", locale: "en" }, "Shown");

  const typeAndPause = async (edit: FieldEdit<string>, value: string) => {
    edit.change(value);
    vi.advanceTimersByTime(EDIT_SAVE_PAUSE_MS);
    await vi.waitFor(() => expect(statuses.at(-1)).not.toBe("saving"), {
      timeout: SAVE_TIME_LIMIT_MS,
    });
  };

  beforeAll(async () => {
    payload = await startRealPayload({
      name: "edit-versions",
      plugin: { inlineEditing: true, instantPreview: true },
    });
    editor = await signIn(payload, EDITOR);
  }, START_TIMEOUT_MS);

  afterAll(async () => {
    await payload.destroy();
  });

  beforeEach(() => {
    vi.useFakeTimers({ toFake: [...TIMERS_OF_THE_PAUSE] });
    statuses = [];
    transport = createEditTransport(
      () => ({ adminOrigin: "", payloadApi: "" }),
      (status) => statuses.push(status),
      pageWindow,
      createEditRoutes({ holdsAnyForm: () => false, win: pageWindow })
    );
  });

  afterEach(() => {
    transport.dispose();
    vi.useRealTimers();
  });

  it("adds one version per edit of a collection whose drafts do not autosave, however often the typing pauses", async () => {
    const created = await payload.create({
      collection: "pages",
      data: { _status: "published", label: "Shown" },
      locale: "en",
    });
    const docId = String(created.id);
    const before = await versionsOf(docId);

    const first = beginEdit(docId);
    for (const value of ["S", "Sh", "Sho"]) await typeAndPause(first, value);
    first.end();
    await untilSaved();
    const afterTheFirstEdit = await versionsOf(docId);

    const second = beginEdit(docId);
    for (const value of ["Show", "Shown", "Shown!"]) await typeAndPause(second, value);
    second.end();
    await untilSaved();

    expect(afterTheFirstEdit - before).toBeLessThanOrEqual(2);
    expect((await versionsOf(docId)) - afterTheFirstEdit).toBe(1);
    expect(
      (
        await payload.findByID({
          collection: "pages",
          context: { visualEditing: false },
          draft: true,
          id: docId,
          locale: "en",
        })
      ).label
    ).toBe("Shown!");
  });
});
