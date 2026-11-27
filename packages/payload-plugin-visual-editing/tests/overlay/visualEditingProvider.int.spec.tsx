import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  useVisualEditing,
  VisualEditingProvider,
} from "../../src/client/react/VisualEditingProvider";
import { VE_FRAME_SETTINGS_TYPE } from "../../src/shared/protocol";
import {
  ADMIN_ORIGIN,
  frameTurnedOff,
  postFromAdmin,
  restorePreviewWindow,
  stubAdminWindow,
  stubFrameElement,
} from "../support/previewWindow";

let container: HTMLDivElement;
let root: Root;
const originalTop = window.top;

function Probe() {
  const { available } = useVisualEditing();
  return <span data-testid="available">{String(available)}</span>;
}

function renderProvider(props: {
  available?: boolean;
  framedOnly?: boolean;
  adminOrigin?: string;
  accentColor?: string;
  accentTextColor?: string;
}) {
  act(() => {
    root.render(
      <VisualEditingProvider {...props}>
        <Probe />
      </VisualEditingProvider>
    );
  });
}

function setFramed(framed: boolean) {
  Object.defineProperty(window, "top", {
    configurable: true,
    value: framed ? ({} as Window) : window,
  });
}

const availableText = () => container.querySelector('[data-testid="available"]')?.textContent;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  Object.defineProperty(window, "top", { configurable: true, value: originalTop });
  localStorage.clear();
  restorePreviewWindow();
});

describe("VisualEditingProvider — framedOnly", () => {
  it("hides the overlay in a standalone tab", () => {
    setFramed(false);
    renderProvider({ available: true, framedOnly: true });
    expect(availableText()).toBe("false");
  });

  it("shows the overlay inside the CMS preview iframe", () => {
    setFramed(true);
    renderProvider({ available: true, framedOnly: true });
    expect(availableText()).toBe("true");
  });

  it("default (framedOnly off) stays available in a standalone tab", () => {
    setFramed(false);
    renderProvider({ available: true });
    expect(availableText()).toBe("true");
  });

  it("never available when the consumer prop is false", () => {
    setFramed(true);
    renderProvider({ available: false, framedOnly: true });
    expect(availableText()).toBe("false");
  });
});

describe("VisualEditingProvider — a frame that turns visual editing off", () => {
  it("is never available in a frame of its own origin with the attribute", () => {
    setFramed(true);
    stubFrameElement(frameTurnedOff());

    renderProvider({ available: true, framedOnly: true });

    expect(availableText()).toBe("false");
  });

  it("turns off when the admin answers that its frame turns it off", () => {
    setFramed(true);
    stubAdminWindow({ postMessage: vi.fn() });
    renderProvider({ adminOrigin: ADMIN_ORIGIN, available: true, framedOnly: true });
    expect(availableText()).toBe("true");

    act(() => postFromAdmin({ type: VE_FRAME_SETTINGS_TYPE, visualEditing: "off" }));

    expect(availableText()).toBe("false");
  });

  it("stays available when the admin answers on", () => {
    setFramed(true);
    stubAdminWindow({ postMessage: vi.fn() });
    renderProvider({ adminOrigin: ADMIN_ORIGIN, available: true, framedOnly: true });

    act(() => postFromAdmin({ type: VE_FRAME_SETTINGS_TYPE, visualEditing: "on" }));

    expect(availableText()).toBe("true");
  });
});

const accentOf = () => document.documentElement.style.getPropertyValue("--ve-accent");
const accentTextOf = () => document.documentElement.style.getPropertyValue("--ve-accent-text");

describe("VisualEditingProvider — accent", () => {
  it("sets the accent the overlay draws with, and takes it away on unmount", () => {
    renderProvider({ available: true, accentColor: "#ea580c", accentTextColor: "#111111" });

    expect(accentOf()).toBe("#ea580c");
    expect(accentTextOf()).toBe("#111111");

    act(() => root.unmount());
    root = createRoot(container);

    expect(accentOf()).toBe("");
    expect(accentTextOf()).toBe("");
  });

  it("leaves the default to the overlay when no accent is passed", () => {
    renderProvider({ available: true });

    expect(accentOf()).toBe("");
  });
});
