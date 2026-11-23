import type { FormState } from "payload";
import type { Root } from "react-dom/client";

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { VeOpenFieldMessage } from "../../src/shared/protocol";

import { createOverlay } from "../../src/client/createOverlay";
import { withVisualEditingPath } from "../../src/client/withVisualEditingPath";
import { OpenFormAnnouncer } from "../../src/admin/openField/OpenFormAnnouncer";
import { VisualEditingBridgeProvider } from "../../src/admin/VisualEditingBridgeProvider";
import { VE_MESSAGE_TYPE } from "../../src/shared/protocol";

import { click, overlayCtx } from "../support/overlay";
import { restorePreviewWindow, stubAdminWindow } from "../support/previewWindow";

type DocumentInfo = { collectionSlug?: string; globalSlug?: string; id?: number | string };

const admin = vi.hoisted(() => ({
  documentInfo: {} as DocumentInfo,
  expandAndFocus: vi.fn(),
  formState: {} as Record<string, unknown>,
}));

vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ getEntityConfig: () => null }),
  useDocumentInfo: () => admin.documentInfo,
  useForm: () => ({ getFields: () => admin.formState as FormState }),
}));

vi.mock("../../src/admin/expandAndFocus", () => ({ expandAndFocus: admin.expandAndFocus }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const ROWS_AS_RENDERED = {
  blocks: {
    rows: [
      { blockType: "hero", id: "row-a" },
      { blockType: "hero", id: "row-b" },
    ],
  },
};

const ROWS_AFTER_THE_MOVE = {
  blocks: {
    rows: [
      { blockType: "hero", id: "row-b" },
      { blockType: "hero", id: "row-a" },
    ],
  },
};

const headingOfRowA: VeOpenFieldMessage = {
  collectionSlug: "pages",
  docId: "7",
  key: "blocks.row-a.heading",
  kind: "collection",
  path: "blocks.0.heading",
  type: VE_MESSAGE_TYPE,
};

const bodyOfRowA = {
  _meta: {
    collectionSlug: "pages",
    docId: "7",
    key: "blocks.row-a.body",
    kind: "collection",
    path: "blocks.0.body",
    terminal: true,
  },
  root: { children: [], type: "root" },
};

const clickRichTextWrapperInPreview = (richTextValue: unknown): VeOpenFieldMessage => {
  const postToAdmin = vi.fn();
  stubAdminWindow({ postMessage: postToAdmin });
  const main = document.createElement("main");
  const wrapper = document.createElement("div");
  for (const [name, value] of Object.entries(withVisualEditingPath(richTextValue))) {
    wrapper.setAttribute(name, value);
  }
  main.append(wrapper);
  document.body.append(main);
  const overlay = createOverlay(main, () =>
    overlayCtx({
      adminOrigin: window.location.origin,
      buildAdminEditUrl: () => "/admin/collections/pages/7",
    })
  );

  click(wrapper);

  overlay.dispose();
  main.remove();
  restorePreviewWindow();
  return postToAdmin.mock.calls[0]?.[0];
};

const originalLocation = window.location;

const openAdminAt = (pathname: string) => {
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...originalLocation, href: `http://localhost:3000${pathname}`, pathname },
  });
};

const postFromPreview = async (message: VeOpenFieldMessage) => {
  await act(async () => {
    window.dispatchEvent(
      new MessageEvent("message", { data: message, origin: window.location.origin })
    );
    await Promise.resolve();
  });
};

const focusedFieldId = () => admin.expandAndFocus.mock.calls.at(-1)?.[1];

describe("opening a field by its key", () => {
  let root: Root;

  const mountAdmin = ({ withForm }: { withForm: boolean }) => {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root.render(
        <VisualEditingBridgeProvider>
          {withForm ? <OpenFormAnnouncer /> : null}
        </VisualEditingBridgeProvider>
      )
    );
  };

  beforeEach(() => {
    admin.expandAndFocus.mockReset();
    admin.documentInfo = { collectionSlug: "pages", id: 7 };
    admin.formState = ROWS_AS_RENDERED;
    openAdminAt("/admin/collections/pages/7");
  });

  afterEach(() => {
    act(() => root.unmount());
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  it("focuses the field where the page rendered it while the rows have not moved", async () => {
    mountAdmin({ withForm: true });

    await postFromPreview(headingOfRowA);

    expect(focusedFieldId()).toBe("field-blocks__0__heading");
  });

  it("focuses the field of the clicked row after the row was moved in the form", async () => {
    mountAdmin({ withForm: true });
    admin.formState = ROWS_AFTER_THE_MOVE;

    await postFromPreview(headingOfRowA);

    expect(focusedFieldId()).toBe("field-blocks__1__heading");
  });

  it("expands the row the field is in now", async () => {
    mountAdmin({ withForm: true });
    admin.formState = ROWS_AFTER_THE_MOVE;

    await postFromPreview(headingOfRowA);

    expect(admin.expandAndFocus.mock.calls.at(-1)?.[0]).toEqual([
      { kind: "row", rowContainerId: "blocks-row-1" },
    ]);
  });

  it("focuses the rich text of the clicked row after the row was moved in the form", async () => {
    mountAdmin({ withForm: true });
    admin.formState = ROWS_AFTER_THE_MOVE;

    const clicked = clickRichTextWrapperInPreview(bodyOfRowA);
    await postFromPreview(clicked);

    expect(clicked).toEqual({
      collectionSlug: "pages",
      docId: "7",
      key: "blocks.row-a.body",
      kind: "collection",
      path: "blocks.0.body",
      type: VE_MESSAGE_TYPE,
    });
    expect(focusedFieldId()).toBe("field-blocks__1__body");
    expect(admin.expandAndFocus.mock.calls.at(-1)?.[0]).toEqual([
      { kind: "row", rowContainerId: "blocks-row-1" },
    ]);
  });

  it("falls back to the path when the message states no key", async () => {
    mountAdmin({ withForm: true });
    admin.formState = ROWS_AFTER_THE_MOVE;
    const { key: _key, ...withoutKey } = headingOfRowA;

    await postFromPreview(withoutKey);

    expect(focusedFieldId()).toBe("field-blocks__0__heading");
  });

  it("opens the list instead of another row when the clicked row is no longer in the form", async () => {
    mountAdmin({ withForm: true });
    admin.formState = { blocks: { rows: [{ blockType: "hero", id: "row-b" }] } };

    await postFromPreview(headingOfRowA);

    expect(focusedFieldId()).toBe("field-blocks");
  });

  it("falls back to the path when no form of the document is open", async () => {
    mountAdmin({ withForm: false });

    await postFromPreview(headingOfRowA);

    expect(focusedFieldId()).toBe("field-blocks__0__heading");
  });

  it("does not read the form of another document", async () => {
    admin.documentInfo = { collectionSlug: "pages", id: 8 };
    mountAdmin({ withForm: true });
    admin.formState = ROWS_AFTER_THE_MOVE;

    await postFromPreview(headingOfRowA);

    expect(focusedFieldId()).toBe("field-blocks__0__heading");
  });

  it("forgets a form that was closed", async () => {
    mountAdmin({ withForm: true });
    admin.formState = ROWS_AFTER_THE_MOVE;
    act(() =>
      root.render(
        <VisualEditingBridgeProvider>
          <div />
        </VisualEditingBridgeProvider>
      )
    );

    await postFromPreview(headingOfRowA);

    expect(focusedFieldId()).toBe("field-blocks__0__heading");
  });

  it("reads the form of a global", async () => {
    admin.documentInfo = { globalSlug: "nav" };
    openAdminAt("/admin/globals/nav");
    mountAdmin({ withForm: true });
    admin.formState = ROWS_AFTER_THE_MOVE;
    const { docId: _docId, ...ofGlobal } = headingOfRowA;

    await postFromPreview({ ...ofGlobal, collectionSlug: "nav", kind: "global" });

    expect(focusedFieldId()).toBe("field-blocks__1__heading");
  });
});
