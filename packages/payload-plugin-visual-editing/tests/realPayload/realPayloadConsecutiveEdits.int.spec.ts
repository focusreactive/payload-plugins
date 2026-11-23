import type { Payload, PayloadRequest } from "payload";

import { createLocalReq } from "payload";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { SaveRefusal } from "../../src/shared/fieldEdit";
import type { VeEditorState } from "../../src/shared/protocol";
import type {
  EditStatus,
  EditTransport,
  EditValue,
  FieldEdit,
} from "../../src/client/inlineEditing/editTransport";

import { createAdminEditChannel } from "../../src/client/inlineEditing/adminEditChannel";
import { createEditRoutes } from "../../src/client/inlineEditing/editRoutes";
import {
  createEditTransport,
  EDIT_SAVE_PAUSE_MS,
} from "../../src/client/inlineEditing/editTransport";
import { VE_FIELD_EDIT_PATH } from "../../src/shared/protocol";

import { START_TIMEOUT_MS, richText, startRealPayload } from "../support/realPayload";
import { page } from "../support/richTextPages";
import { EDITOR, signIn } from "../support/unsavedRichTextRequests";

const SAVE_TIME_LIMIT_MS = 5000;

const TIMERS_OF_THE_PAUSE = ["setTimeout", "clearTimeout"] as const;

const BOLD = 1;

const boldRichText = (text: string): VeEditorState => {
  const state = richText(text);
  const [paragraph] = state.root.children;
  const [leaf] = paragraph!.children;
  return {
    ...state,
    root: { ...state.root, children: [{ ...paragraph!, children: [{ ...leaf!, format: BOLD }] }] },
  } as VeEditorState;
};

describe("consecutive edits of one field on a page of its own", () => {
  let payload: Payload;
  let editor: Headers;
  let transport: EditTransport;
  let statuses: EditStatus[];
  let refusals: (SaveRefusal | undefined)[];

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

  const untilAnswered = () =>
    vi.waitFor(() => expect(["saved", "failed"]).toContain(statuses.at(-1)), {
      timeout: SAVE_TIME_LIMIT_MS,
    });

  const typeAndPause = async <Value extends EditValue>(edit: FieldEdit<Value>, value: Value) => {
    edit.change(value);
    vi.advanceTimersByTime(EDIT_SAVE_PAUSE_MS);
    await untilAnswered();
  };

  const createDraft = async (data: Record<string, unknown>) =>
    String((await payload.create({ collection: "pages", data, draft: true, locale: "en" })).id);

  const readDraft = (docId: string) =>
    payload.findByID({
      collection: "pages",
      context: { visualEditing: false },
      depth: 0,
      draft: true,
      id: docId,
      locale: "en",
    }) as Promise<Record<string, unknown>>;

  beforeAll(async () => {
    payload = await startRealPayload({
      autosave: true,
      name: "consecutive-edits",
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
    refusals = [];
    transport = createEditTransport(
      () => ({ payloadApi: "" }),
      (status, refusal) => {
        statuses.push(status);
        refusals.push(refusal);
      },
      pageWindow,
      createEditRoutes({ holdsAnyForm: () => false, win: pageWindow }),
      createAdminEditChannel(pageWindow, () => "")
    );
  });

  afterEach(() => {
    transport.dispose();
    vi.useRealTimers();
  });

  it("saves every pause of a second edit of a text", async () => {
    const docId = await createDraft({ label: "Shown" });
    const label = { ...page(docId), key: "label", locale: "en" };

    const first = transport.beginEdit(label, "Shown");
    await typeAndPause(first, "Shown T0");
    first.end();
    const second = transport.beginEdit(label, "Shown T0");
    await typeAndPause(second, "Shown T0 T1");
    await typeAndPause(second, "Shown T0 T1 T2");
    second.end();

    expect(statuses.at(-1)).toBe("saved");
    expect((await readDraft(docId)).label).toBe("Shown T0 T1 T2");
  });

  it("saves every pause of a second edit of a rich text, a bold text too", async () => {
    const docId = await createDraft({ body: richText("Hello") });
    const body = { ...page(docId), key: "body", locale: "en" };

    const first = transport.beginEdit(body, richText("Hello") as VeEditorState);
    await typeAndPause(first, richText("Hello T0") as VeEditorState);
    first.end();
    const second = transport.beginEdit(body, richText("Hello T0") as VeEditorState);
    await typeAndPause(second, richText("Hello T0 T1") as VeEditorState);
    await typeAndPause(second, boldRichText("Hello T0 T1"));
    second.end();

    expect(statuses.at(-1)).toBe("saved");
    expect((await readDraft(docId)).body).toEqual(boldRichText("Hello T0 T1"));
  });

  it("still refuses a pause of a second edit once the field was changed elsewhere", async () => {
    const docId = await createDraft({ label: "Shown" });
    const label = { ...page(docId), key: "label", locale: "en" };
    const first = transport.beginEdit(label, "Shown");
    await typeAndPause(first, "Shown T0");
    first.end();
    const second = transport.beginEdit(label, "Shown T0");
    await typeAndPause(second, "Shown T0 T1");

    await payload.update({
      collection: "pages",
      data: { label: "Elsewhere" },
      draft: true,
      id: docId,
      locale: "en",
    });
    await typeAndPause(second, "Shown T0 T1 T2");

    expect(statuses.at(-1)).toBe("failed");
    expect(refusals.at(-1)).toBe("changed");
    expect((await readDraft(docId)).label).toBe("Elsewhere");
  });
});
