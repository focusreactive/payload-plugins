// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { useVisualEditing, VisualEditingProvider } from "../src/client/VisualEditingProvider";

let container: HTMLDivElement;
let root: Root;
const originalTop = window.top;

function Probe() {
  const { available } = useVisualEditing();
  return <span data-testid="available">{String(available)}</span>;
}

function renderProvider(props: { available?: boolean; framedOnly?: boolean }) {
  act(() => {
    root.render(
      <VisualEditingProvider {...props}>
        <Probe />
      </VisualEditingProvider>
    );
  });
}

// jsdom defaults window.top === window (not framed); override to simulate the CMS iframe.
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
