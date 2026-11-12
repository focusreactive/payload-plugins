import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SchemaField } from "../../src/shared/editableSchema/editableSchema";

import { VisualEditingBridgeProvider } from "../../src/admin/VisualEditingBridgeProvider";
import { createOverlay } from "../../src/client/createOverlay";
import { withVisualEditingPath } from "../../src/client/withVisualEditingPath";
import { buildEditableSchema } from "../../src/shared/editableSchema/editableSchema";
import { markRead } from "../../src/server/markRead";

import { restorePreviewWindow, stubAdminWindow } from "../support/previewWindow";
import { click } from "../support/overlay";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const FOCUS_DELAY_MS = 700;

const pageFields = [
  { name: "title", type: "text" },
  { hasMany: true, name: "gallery", relationTo: "media", type: "upload" },
];

vi.mock("@payloadcms/ui", () => ({
  useConfig: () => ({ getEntityConfig: () => ({ fields: pageFields }) }),
}));

const pagesSchema = buildEditableSchema(pageFields as SchemaField[]);

const readHomeWithPopulatedGallery = () =>
  markRead(
    {
      gallery: [
        { alt: "A harbour", id: "M1" },
        { alt: "A pier", id: "M2" },
      ],
      id: "1",
    },
    { identity: { collectionSlug: "pages", docId: "1", kind: "collection" }, schema: pagesSchema }
  );

const originalLocation = window.location;

describe("an image of a hasMany upload marked with withVisualEditingPath", () => {
  let root: Root;
  let stopOverlay: () => void;
  let image: HTMLElement;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, pathname: "/admin/collections/pages/1" },
    });
    stubAdminWindow({
      postMessage: (data: unknown) =>
        window.dispatchEvent(new MessageEvent("message", { data, origin: window.location.origin })),
    });

    document.body.innerHTML = `
      <div class="field-type upload" id="field-gallery"><input name="gallery" /></div>
      <div id="bridge"></div>
      <main></main>
    `;
    root = createRoot(document.querySelector("#bridge") as HTMLElement);
    act(() => root.render(<VisualEditingBridgeProvider>{null}</VisualEditingBridgeProvider>));

    const main = document.querySelector("main") as HTMLElement;
    image = document.createElement("img");
    const [, secondPhoto] = readHomeWithPopulatedGallery().gallery;
    for (const [name, value] of Object.entries(withVisualEditingPath(secondPhoto))) {
      image.setAttribute(name, value);
    }
    main.append(image);
    const overlay = createOverlay(main, () => ({
      adminBasePath: "/admin",
      adminOrigin: window.location.origin,
      buildAdminEditUrl: () => "/admin/edit",
      mode: "always",
    }));
    stopOverlay = () => overlay.dispose();
  });

  afterEach(() => {
    stopOverlay();
    act(() => root.unmount());
    restorePreviewWindow();
    Object.defineProperty(window, "location", { configurable: true, value: originalLocation });
  });

  it("focuses the upload field in the admin when it is clicked", async () => {
    click(image);
    await new Promise((resolve) => setTimeout(resolve, FOCUS_DELAY_MS));

    expect(document.activeElement).toBe(document.querySelector('input[name="gallery"]'));
  });
});
