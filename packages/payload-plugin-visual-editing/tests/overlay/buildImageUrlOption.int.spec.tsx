import type { Root } from "react-dom/client";

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PickedMedia } from "../../src/client";

import { DATA_VE_MEDIA_PICKER_ATTR } from "../../src/client/inlineEditing/mediaPicker";
import { DATA_VE_ACTION_ATTR } from "../../src/client/overlay/constants";
import { VisualEditingOverlay } from "../../src/client/react/VisualEditingOverlay";
import { VisualEditingProvider } from "../../src/client/react/VisualEditingProvider";
import { identityAttrsOf } from "../../src/client/withVisualEditingPath";
import { mountVisualEditing } from "../../src/dom";

import { click } from "../support/overlay";

const PAYLOAD_API = "https://cms.example.com/api";

const IMAGE = { collectionSlug: "page", docId: "1", kind: "collection", path: "image" } as const;

const LIGHTHOUSE = {
  filename: "lighthouse.jpg",
  id: 9,
  thumbnailUrl: "/api/media/file/lighthouse-small.jpg",
  url: "/api/media/file/lighthouse.jpg",
};

const SITE_IMAGE = "/images/lighthouse.jpg?width=1080";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const buildImageUrl = ({ filename }: PickedMedia) => `/images/${filename}?width=1080`;

const shownImage = () => document.querySelector("img") as HTMLImageElement;

const pickLighthouse = async () => {
  await act(() => vi.advanceTimersByTimeAsync(0));
  shownImage().dispatchEvent(new MouseEvent("mouseenter"));
  click(document.querySelector(`[${DATA_VE_ACTION_ATTR}]`) as HTMLElement);
  await act(() => vi.advanceTimersByTimeAsync(0));
  const picker = document.querySelector(`[${DATA_VE_MEDIA_PICKER_ATTR}]`)?.shadowRoot;
  picker?.querySelector<HTMLButtonElement>(".grid button")?.click();
  picker?.querySelector<HTMLButtonElement>('[data-action="use"]')?.click();
  await act(() => vi.advanceTimersByTimeAsync(0));
};

describe("the address a site gives a picked image", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve({
          json: () =>
            Promise.resolve(
              url.endsWith("/media-options")
                ? { collection: "media", documents: [LIGHTHOUSE], hasNextPage: false }
                : { saved: true }
            ),
          ok: true,
          status: 200,
        } as Response)
      )
    );
    vi.spyOn(window, "open").mockImplementation(() => null);
    container = document.createElement("div");
    document.body.append(container);
  });

  afterEach(() => {
    container.remove();
    localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("through the React provider", () => {
    let root: Root;

    const render = (src?: (media: PickedMedia) => string | undefined) =>
      act(() =>
        root.render(
          <VisualEditingProvider
            available
            buildImageUrl={src}
            inlineEditing
            payloadApi={PAYLOAD_API}
          >
            <VisualEditingOverlay locale="en">
              {createElement("img", { alt: "", src: "/old.jpg", ...identityAttrsOf(IMAGE) })}
            </VisualEditingOverlay>
          </VisualEditingProvider>
        )
      );

    beforeEach(() => {
      root = createRoot(container);
    });

    afterEach(() => {
      act(() => root.unmount());
    });

    it("shows the picked image at that address", async () => {
      render(buildImageUrl);

      await pickLighthouse();

      expect(shownImage().getAttribute("src")).toBe(SITE_IMAGE);
    });

    it("shows it at the address of the API when the option gives none", async () => {
      render(() => undefined);

      await pickLighthouse();

      expect(shownImage().getAttribute("src")).toBe(
        "https://cms.example.com/api/media/file/lighthouse.jpg"
      );
    });

    it("shows it at the address of the API without the option", async () => {
      render();

      await pickLighthouse();

      expect(shownImage().getAttribute("src")).toBe(
        "https://cms.example.com/api/media/file/lighthouse.jpg"
      );
    });
  });

  describe("through a page without React", () => {
    it("shows the picked image at that address", async () => {
      const image = Object.assign(document.createElement("img"), { alt: "", src: "/old.jpg" });
      for (const [name, value] of Object.entries(identityAttrsOf(IMAGE))) {
        image.setAttribute(name, value);
      }
      container.append(image);
      const mounted = mountVisualEditing({
        available: true,
        buildImageUrl,
        inlineEditing: true,
        locale: "en",
        payloadApi: PAYLOAD_API,
        root: container,
        toggle: false,
      });

      await pickLighthouse();
      mounted.destroy();

      expect(image.getAttribute("src")).toBe(SITE_IMAGE);
    });
  });
});
