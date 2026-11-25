import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OverlayScope } from "../../src/client/overlayScope";
import type { PageState, SessionOptions } from "../../src/client/session";
import type { FollowingSession } from "../../src/client/sessionOverlay";

import { DATA_VE_TARGET_ATTR } from "../../src/client/overlay/constants";
import { savedShapesWithin } from "../../src/client/overlayScope";
import { sessionOf } from "../../src/client/session";
import { startSessionOverlay, startSessionToggle } from "../../src/client/sessionOverlay";
import { DATA_VE_TOGGLE_ATTR } from "../../src/client/toggle";
import { VE_FIELDS_RENDERED_TYPE } from "../../src/shared/protocol";
import { markedText } from "../support/markedData";
import { ADMIN_ORIGIN, restorePreviewWindow, stubAdminWindow } from "../support/previewWindow";
import { flushMutations } from "../support/time";

const PAGE = { collectionSlug: "page", docId: "1", kind: "collection" } as const;
const MARKED_TITLE = markedText("Hello", { ...PAGE, path: "title" });
const SITE_ORIGIN = "https://site.example";
const FRAMED: PageState = {
  isFramed: true,
  chosenMode: "off",
  pageOrigin: SITE_ORIGIN,
};
const STANDALONE: PageState = { ...FRAMED, isFramed: false };
const DRAFT: SessionOptions = { adminOrigin: ADMIN_ORIGIN, available: true };

describe("the session of a page, followed", () => {
  let main: HTMLElement;
  let heading: HTMLHeadingElement;
  let options: SessionOptions;
  let page: PageState;
  let following: FollowingSession | null;
  const postToAdmin = vi.fn();
  const scope: OverlayScope = { locale: "en", savedShapes: savedShapesWithin(null) };

  const session = () => sessionOf(options, page);

  const targets = () => main.querySelectorAll(`[${DATA_VE_TARGET_ATTR}]`);

  const announcedFields = () =>
    postToAdmin.mock.calls.filter(([message]) => message.type === VE_FIELDS_RENDERED_TYPE);

  beforeEach(() => {
    following = null;
    options = DRAFT;
    page = FRAMED;
    postToAdmin.mockClear();
    main = document.createElement("main");
    heading = document.createElement("h1");
    heading.textContent = MARKED_TITLE;
    main.append(heading);
    document.body.append(main);
    document.title = MARKED_TITLE;
    stubAdminWindow({ postMessage: postToAdmin });
  });

  afterEach(() => {
    following?.dispose();
    document.body.innerHTML = "";
    document.title = "";
    restorePreviewWindow();
  });

  describe("by the overlay of a root", () => {
    const start = () => {
      following = startSessionOverlay(main, () => scope, session);
      return following;
    };

    it("outlines editable text in the mode of the session", async () => {
      page = { ...FRAMED, chosenMode: "always" };

      start();
      await flushMutations();

      expect(targets()).toHaveLength(1);
      expect(heading.textContent).toBe("Hello");
    });

    it("runs without outlines while the mode is off and instant preview is on", async () => {
      start();
      await flushMutations();

      expect(targets()).toHaveLength(0);
      expect(heading.textContent).toBe("Hello");
      expect(announcedFields()).toHaveLength(1);
    });

    it("follows the mode the editor picks", async () => {
      const overlay = start();

      page = { ...FRAMED, chosenMode: "always" };
      overlay.sync();
      await flushMutations();
      expect(targets()).toHaveLength(1);

      page = FRAMED;
      overlay.sync();
      await flushMutations();
      expect(targets()).toHaveLength(0);
    });

    it("keeps one overlay over a change that asks for no other", async () => {
      const overlay = start();
      await flushMutations();

      page = { ...FRAMED, chosenMode: "always" };
      overlay.sync();
      overlay.sync();
      await flushMutations();

      expect(announcedFields()).toHaveLength(1);
    });

    it("announces no fields without instant preview", async () => {
      options = { ...DRAFT, instantPreview: false };
      page = { ...FRAMED, chosenMode: "always" };

      start();
      await flushMutations();

      expect(targets()).toHaveLength(1);
      expect(announcedFields()).toHaveLength(0);
    });

    it("starts to announce fields when instant preview is turned on", async () => {
      options = { ...DRAFT, instantPreview: false };
      page = { ...FRAMED, chosenMode: "always" };
      const overlay = start();
      await flushMutations();

      options = DRAFT;
      overlay.sync();
      await flushMutations();

      expect(targets()).toHaveLength(1);
      expect(announcedFields()).toHaveLength(1);
    });

    describe("on a draft page with nothing to show", () => {
      beforeEach(() => {
        options = { ...DRAFT, framedOnly: true };
        page = STANDALONE;
      });

      it("cleans the markers of the page, also of what the page adds later", async () => {
        start();
        const added = document.createElement("h2");
        added.textContent = MARKED_TITLE;
        main.append(added);
        await flushMutations();

        expect(heading.textContent).toBe("Hello");
        expect(added.textContent).toBe("Hello");
        expect(document.title).toBe("Hello");
        expect(targets()).toHaveLength(0);
      });

      it("cleans them too while the mode is off and instant preview is not on", () => {
        options = { ...DRAFT, instantPreview: false };
        page = FRAMED;

        start();

        expect(heading.textContent).toBe("Hello");
        expect(announcedFields()).toHaveLength(0);
      });

      it("hands the page to the overlay once the session has something to show", async () => {
        const overlay = start();

        options = DRAFT;
        page = { ...FRAMED, chosenMode: "always" };
        overlay.sync();
        await flushMutations();

        expect(targets()).toHaveLength(1);
        expect(heading.textContent).toBe("Hello");
      });

      it("takes the page back from the overlay", async () => {
        options = { ...DRAFT, instantPreview: false };
        page = { ...FRAMED, chosenMode: "always" };
        const overlay = start();
        await flushMutations();

        page = FRAMED;
        overlay.sync();
        await flushMutations();

        expect(targets()).toHaveLength(0);
        expect(heading.textContent).toBe("Hello");
        expect(document.title).toBe("Hello");
      });

      it("gives the markers back when it is disposed of", () => {
        start().dispose();
        following = null;

        expect(heading.textContent).toBe(MARKED_TITLE);
        expect(document.title).toBe(MARKED_TITLE);
      });
    });

    it("leaves a page read without drafts alone", () => {
      options = { adminOrigin: ADMIN_ORIGIN, available: false };

      start();

      expect(heading.textContent).toBe(MARKED_TITLE);
      expect(document.title).toBe(MARKED_TITLE);
    });
  });

  describe("by the toggle", () => {
    const setMode = vi.fn();

    const host = () => document.querySelector<HTMLElement>(`[${DATA_VE_TOGGLE_ATTR}]`);

    const buttons = () => [...(host()?.shadowRoot?.querySelectorAll("button") ?? [])];

    const checkedLabels = () =>
      buttons()
        .filter((button) => button.getAttribute("aria-checked") === "true")
        .map((button) => button.textContent);

    const start = () => {
      following = startSessionToggle(document, session, setMode);
      return following;
    };

    beforeEach(() => {
      setMode.mockClear();
    });

    it("shows the mode of the session and the one it changes to", () => {
      const toggle = start();
      expect(checkedLabels()).toEqual(["Off"]);

      page = { ...FRAMED, chosenMode: "hover" };
      toggle.sync();

      expect(checkedLabels()).toEqual(["Hover"]);
      expect(document.querySelectorAll(`[${DATA_VE_TOGGLE_ATTR}]`)).toHaveLength(1);
    });

    it("reports the mode the editor picks", () => {
      start();

      buttons()
        .find((button) => button.textContent === "Always")
        ?.click();

      expect(setMode).toHaveBeenCalledWith("always");
    });

    it("is not there while visual editing is not available", () => {
      options = { ...DRAFT, framedOnly: true };
      page = STANDALONE;
      const toggle = start();
      expect(host()).toBeNull();

      page = FRAMED;
      toggle.sync();
      expect(host()).not.toBeNull();

      page = STANDALONE;
      toggle.sync();
      expect(host()).toBeNull();
    });

    it("is removed when it is disposed of", () => {
      start().dispose();
      following = null;

      expect(host()).toBeNull();
    });

    it("offers only its modes where the site turned editing on the page on", () => {
      options = { ...DRAFT, inlineEditing: true };

      start();

      expect(buttons().map((button) => button.textContent)).toEqual(["Off", "Hover", "Always"]);
    });
  });
});
