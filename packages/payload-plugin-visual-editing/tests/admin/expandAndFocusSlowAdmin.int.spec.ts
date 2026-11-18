import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { applyContainerChain, expandAndFocus } from "../../src/admin/expandAndFocus";

const SLOW_RENDER_MS = 6000;
const FOCUS_DELAY_MS = 500;

const collapsedRow = (id: string): HTMLElement => {
  const row = document.createElement("div");
  row.id = id;
  row.innerHTML = '<button class="collapsible__toggle collapsible__toggle--collapsed">Row</button>';
  const toggle = row.querySelector<HTMLButtonElement>(".collapsible__toggle")!;
  toggle.addEventListener("click", () => toggle.classList.remove("collapsible__toggle--collapsed"));
  return row;
};

const inputOf = (id: string): HTMLInputElement => {
  const input = document.createElement("input");
  input.id = id;
  return input;
};

const VIEWPORT_HEIGHT = 768;
const ROW_HEIGHT = 200;
const CENTERED_TOP = (VIEWPORT_HEIGHT - ROW_HEIGHT) / 2;
const GROWTH_ABOVE_PX = 2500;
const GROWTH_AFTER_MS = 100;
const LAZY_RENDER_MS = 1000;

type Layout = { top: number; scrolls: number };

const layOut = (element: HTMLElement, top: number): Layout => {
  const layout = { scrolls: 0, top };
  element.getBoundingClientRect = () => new DOMRect(0, layout.top, 800, ROW_HEIGHT);
  element.scrollIntoView = () => {
    layout.scrolls += 1;
    layout.top = CENTERED_TOP;
  };
  return layout;
};

const isInView = ({ top }: Layout) => top + ROW_HEIGHT > 0 && top < VIEWPORT_HEIGHT;

const renderFieldsWhileInView = (row: HTMLElement, layout: Layout, fieldId: string) =>
  setInterval(() => {
    if (isInView(layout) && !row.querySelector("input")) row.append(inputOf(fieldId));
  }, LAZY_RENDER_MS);

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("innerHeight", VIEWPORT_HEIGHT);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

describe("a field to focus in a slow admin", () => {
  it("focuses the editor of a rich text field that mounts after its wrapper", async () => {
    document.body.innerHTML = `
			<div class="field-type rich-text-lexical">
				<label for="field-content">Content</label>
			</div>
		`;
    const walk = expandAndFocus([], "field-content");

    await vi.advanceTimersByTimeAsync(SLOW_RENDER_MS);
    const editor = document.createElement("div");
    editor.dataset.lexicalEditor = "true";
    editor.tabIndex = 0;
    document.querySelector(".rich-text-lexical")!.append(editor);
    await vi.advanceTimersByTimeAsync(FOCUS_DELAY_MS);
    await walk;

    expect(document.activeElement).toBe(editor);
  });

  it("expands a row that renders long after its block was expanded", async () => {
    const block = collapsedRow("blocks-row-3");
    document.body.append(block);
    const walk = applyContainerChain([
      { kind: "row", rowContainerId: "blocks-row-3" },
      { kind: "row", rowContainerId: "blocks-3-items-row-0" },
    ]);

    await vi.advanceTimersByTimeAsync(SLOW_RENDER_MS);
    const row = collapsedRow("blocks-3-items-row-0");
    block.append(row);
    await vi.advanceTimersByTimeAsync(FOCUS_DELAY_MS);

    expect(await walk).toBe(true);
    expect(row.querySelector(".collapsible__toggle--collapsed")).toBeNull();
  });

  it("focuses a field that renders long after its row was expanded", async () => {
    const block = collapsedRow("blocks-row-3");
    document.body.append(block);
    const walk = expandAndFocus(
      [{ kind: "row", rowContainerId: "blocks-row-3" }],
      "field-blocks__3__title"
    );

    await vi.advanceTimersByTimeAsync(SLOW_RENDER_MS);
    block.append(inputOf("field-blocks__3__title"));
    await vi.advanceTimersByTimeAsync(2 * FOCUS_DELAY_MS);
    await walk;

    expect(document.activeElement?.id).toBe("field-blocks__3__title");
  });

  it("stops waiting for a step that never renders", async () => {
    const walk = applyContainerChain([{ kind: "tab", tabIndex: 0 }]);

    await vi.advanceTimersByTimeAsync(60_000);

    expect(await walk).toBe(false);
  });

  it("gives up a field once another one is asked for", async () => {
    document.body.append(inputOf("field-title"));
    const first = expandAndFocus([], "field-missing");
    const second = expandAndFocus([], "field-title");
    await vi.advanceTimersByTimeAsync(2 * FOCUS_DELAY_MS);
    await Promise.all([first, second]);

    document.body.append(inputOf("field-missing"));
    await vi.advanceTimersByTimeAsync(SLOW_RENDER_MS);

    expect(document.activeElement?.id).toBe("field-title");
  });
});

describe("a field in a block that was collapsed when the admin loaded", () => {
  it("scrolls the expanded block itself into view, so its fields render, and focuses the field", async () => {
    document.body.innerHTML = '<div class="field-type blocks-field" id="field-blocks"></div>';
    const container = document.querySelector<HTMLElement>("#field-blocks")!;
    const block = collapsedRow("blocks-row-3");
    container.append(block);
    const containerScrolls = vi.fn();
    container.scrollIntoView = containerScrolls;
    block.scrollIntoView = () => {
      if (block.querySelector(".collapsible__toggle--collapsed")) return;
      if (!block.querySelector("#field-blocks__3__link__title")) {
        block.append(inputOf("field-blocks__3__link__title"));
      }
    };

    const walk = expandAndFocus(
      [{ kind: "row", rowContainerId: "blocks-row-3" }],
      "field-blocks__3__link__title"
    );
    await vi.advanceTimersByTimeAsync(2 * FOCUS_DELAY_MS);
    await walk;

    expect(document.activeElement?.id).toBe("field-blocks__3__link__title");
  });

  it("scrolls a group of the block into view once it renders, so the fields below it render", async () => {
    const block = collapsedRow("blocks-row-3");
    document.body.append(block);
    const group = document.createElement("div");
    group.id = "field-blocks__3__link";
    group.scrollIntoView = () => {
      if (!group.firstChild) group.append(inputOf("field-blocks__3__link__title"));
    };
    block.scrollIntoView = () => {
      if (!group.isConnected) block.append(group);
    };

    const walk = expandAndFocus(
      [{ kind: "row", rowContainerId: "blocks-row-3" }],
      "field-blocks__3__link__title"
    );
    await vi.advanceTimersByTimeAsync(2 * FOCUS_DELAY_MS);
    await walk;

    expect(document.activeElement?.id).toBe("field-blocks__3__link__title");
  });

  it("scrolls the block into view again when rows above it grow and push it out", async () => {
    const block = collapsedRow("blocks-row-3");
    document.body.append(block);
    const layout = layOut(block, 4 * VIEWPORT_HEIGHT);
    renderFieldsWhileInView(block, layout, "field-blocks__3__title");
    setTimeout(() => {
      layout.top += GROWTH_ABOVE_PX;
    }, GROWTH_AFTER_MS);

    const walk = expandAndFocus(
      [{ kind: "row", rowContainerId: "blocks-row-3" }],
      "field-blocks__3__title"
    );
    await vi.advanceTimersByTimeAsync(LAZY_RENDER_MS + 2 * FOCUS_DELAY_MS);
    await walk;

    expect(document.activeElement?.id).toBe("field-blocks__3__title");
    expect(layout.scrolls).toBe(2);
  });

  it("scrolls the block again every time it is pushed out before its fields render", async () => {
    const block = collapsedRow("blocks-row-3");
    document.body.append(block);
    const layout = layOut(block, 4 * VIEWPORT_HEIGHT);
    renderFieldsWhileInView(block, layout, "field-blocks__3__title");
    const growth = setInterval(() => {
      layout.top += GROWTH_ABOVE_PX;
    }, GROWTH_AFTER_MS);
    setTimeout(() => clearInterval(growth), LAZY_RENDER_MS / 2);

    const walk = expandAndFocus(
      [{ kind: "row", rowContainerId: "blocks-row-3" }],
      "field-blocks__3__title"
    );
    await vi.advanceTimersByTimeAsync(LAZY_RENDER_MS + 2 * FOCUS_DELAY_MS);
    await walk;

    expect(document.activeElement?.id).toBe("field-blocks__3__title");
  });

  it("leaves a block that stays in view where the editor scrolled it", async () => {
    const block = collapsedRow("blocks-row-3");
    document.body.append(block);
    const layout = layOut(block, 4 * VIEWPORT_HEIGHT);

    const walk = expandAndFocus(
      [{ kind: "row", rowContainerId: "blocks-row-3" }],
      "field-blocks__3__title"
    );
    await vi.advanceTimersByTimeAsync(SLOW_RENDER_MS);
    layout.top = VIEWPORT_HEIGHT - 1;
    await vi.advanceTimersByTimeAsync(SLOW_RENDER_MS);
    block.append(inputOf("field-blocks__3__title"));
    await vi.advanceTimersByTimeAsync(2 * FOCUS_DELAY_MS);
    await walk;

    expect(layout.scrolls).toBe(1);
    expect(document.activeElement?.id).toBe("field-blocks__3__title");
  });
});

describe("a field that is already on screen", () => {
  it("focuses it at once, without scrolling to it or waiting for a scroll", async () => {
    const input = inputOf("field-title");
    document.body.append(input);
    const layout = layOut(input, CENTERED_TOP);

    const walk = expandAndFocus([], "field-title");
    await vi.advanceTimersByTimeAsync(0);
    await walk;

    expect(document.activeElement).toBe(input);
    expect(layout.scrolls).toBe(0);
  });

  it("scrolls to a field that the document header covers before it focuses it", async () => {
    document.body.innerHTML = '<div class="doc-controls"></div>';
    const header = document.querySelector<HTMLElement>(".doc-controls")!;
    header.getBoundingClientRect = () => new DOMRect(0, 0, 800, 2 * ROW_HEIGHT);
    const input = inputOf("field-title");
    document.body.append(input);
    const layout = layOut(input, ROW_HEIGHT);

    const walk = expandAndFocus([], "field-title");
    await vi.advanceTimersByTimeAsync(FOCUS_DELAY_MS - 1);
    const focusedBeforeTheScrollEnds = document.activeElement === input;
    await vi.advanceTimersByTimeAsync(1);
    await walk;

    expect(focusedBeforeTheScrollEnds).toBe(false);
    expect(layout.scrolls).toBe(1);
    expect(document.activeElement).toBe(input);
  });
});
