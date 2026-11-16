import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useVisualEditing, VisualEditingProvider } from "../../src/client/VisualEditingProvider";

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

describe("VisualEditingProvider — accent", () => {
  const accentOf = () => document.documentElement.style.getPropertyValue("--ve-accent");
  const accentTextOf = () => document.documentElement.style.getPropertyValue("--ve-accent-text");

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
