// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";

import {
  applyContainerChain,
  expandAndFocus,
  findFieldElement,
  scrollNearestAncestorIntoView,
} from "../src/admin/expandAndFocus";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("findFieldElement", () => {
  it("returns the element directly when the id exists", () => {
    document.body.innerHTML = '<input id="field-title" />';
    const el = findFieldElement("field-title");
    expect(el?.id).toBe("field-title");
  });

  it("walks from label[for=…] up to .field-type for rich-text fields", () => {
    document.body.innerHTML = `
			<div class="field-type rich-text-lexical" data-testid="wrapper">
				<label for="field-layout__0__content">Content</label>
				<div class="rich-text-lexical__wrap">
					<div data-lexical-editor="true"></div>
				</div>
			</div>
		`;
    const el = findFieldElement("field-layout__0__content");
    expect(el?.getAttribute("data-testid")).toBe("wrapper");
  });

  it("returns null when neither id nor label[for] exists", () => {
    document.body.innerHTML = '<div class="field-type"></div>';
    expect(findFieldElement("field-missing")).toBeNull();
  });
});

describe("scrollNearestAncestorIntoView", () => {
  // Payload wraps every `RenderFields` in `<RenderIfInViewport>` — an
  // IntersectionObserver with `rootMargin: 1000px` that only mounts children
  // once the wrapper scrolls within range. Fields far below the viewport have
  // their wrapper id in the DOM but zero inner field ids. We force hydration
  // by scrolling the deepest-existing ancestor into view.
  it("walks up the path and scrolls the deepest existing ancestor", () => {
    document.body.innerHTML = `
			<div id="field-default__careers">
				<span class="field-label">Careers</span>
			</div>
		`;
    const wrapper = document.querySelector("#field-default__careers")!;
    let scrolled = false;
    wrapper.scrollIntoView = () => {
      scrolled = true;
    };

    scrollNearestAncestorIntoView("field-default__careers__links__0__link__label");
    expect(scrolled).toBe(true);
  });

  it("no-ops when no ancestor is mounted", () => {
    document.body.innerHTML = "";
    // Does not throw.
    expect(() =>
      scrollNearestAncestorIntoView("field-default__careers__links__0__link__label")
    ).not.toThrow();
  });
});

describe("applyContainerChain — tab instruction", () => {
  it("clicks the tab button at the given index", async () => {
    document.body.innerHTML = `
			<div class="tabs-field">
				<button class="tabs-field__tab-button tabs-field__tab-button--active">General</button>
				<button class="tabs-field__tab-button">Translation</button>
			</div>
		`;
    const buttons = document.querySelectorAll<HTMLButtonElement>(".tabs-field__tab-button");
    buttons[1]!.addEventListener("click", () => {
      buttons[0]!.classList.remove("tabs-field__tab-button--active");
      buttons[1]!.classList.add("tabs-field__tab-button--active");
    });

    const ok = await applyContainerChain([{ kind: "tab", tabIndex: 1 }]);
    expect(ok).toBe(true);
    expect(buttons[1]!.classList.contains("tabs-field__tab-button--active")).toBe(true);
  });

  it("is idempotent when the tab is already active (no click)", async () => {
    document.body.innerHTML = `
			<div class="tabs-field">
				<button class="tabs-field__tab-button tabs-field__tab-button--active">General</button>
				<button class="tabs-field__tab-button">Translation</button>
			</div>
		`;
    let clicks = 0;
    document.querySelectorAll(".tabs-field__tab-button").forEach((b) => {
      b.addEventListener("click", () => {
        clicks++;
      });
    });

    const ok = await applyContainerChain([{ kind: "tab", tabIndex: 0 }]);
    expect(ok).toBe(true);
    expect(clicks).toBe(0);
  });

  it("waits for a slow tab-render, then resolves the next step", async () => {
    // Tab button renders 200ms after chain starts.
    document.body.innerHTML = '<div class="tabs-field"></div>';
    setTimeout(() => {
      document.querySelector(".tabs-field")!.innerHTML = `
				<button class="tabs-field__tab-button">A</button>
				<button class="tabs-field__tab-button tabs-field__tab-button--active">B</button>
			`;
    }, 200);

    const ok = await applyContainerChain([{ kind: "tab", tabIndex: 1 }]);
    expect(ok).toBe(true);
  });
});

describe("applyContainerChain — collapsible instruction", () => {
  it("clicks the toggle inside #field-collapsible-<schemaPath__>", async () => {
    document.body.innerHTML = `
			<div id="field-collapsible-translation___index-0" class="collapsible collapsible--collapsed">
				<button class="collapsible__toggle collapsible__toggle--collapsed">Forms</button>
				<div class="collapsible__content"></div>
			</div>
		`;
    const toggle = document.querySelector<HTMLButtonElement>(".collapsible__toggle")!;
    toggle.addEventListener("click", () => {
      toggle.classList.remove("collapsible__toggle--collapsed");
    });

    const ok = await applyContainerChain([{ kind: "collapsible", path: "translation._index-0" }]);
    expect(ok).toBe(true);
    expect(toggle.classList.contains("collapsible__toggle--collapsed")).toBe(false);
  });

  it("skips the click when the collapsible is already open", async () => {
    document.body.innerHTML = `
			<div id="field-collapsible-translation___index-0" class="collapsible">
				<button class="collapsible__toggle">Forms</button>
			</div>
		`;
    let clicks = 0;
    document.querySelector(".collapsible__toggle")!.addEventListener("click", () => {
      clicks++;
    });

    const ok = await applyContainerChain([{ kind: "collapsible", path: "translation._index-0" }]);
    expect(ok).toBe(true);
    expect(clicks).toBe(0);
  });
});

describe("applyContainerChain — scope narrowing", () => {
  it("nested tab click resolves inside the row, not at document root", async () => {
    // Mirrors the real bug: top-level tabs + a row containing its own nested
    // tabs field. Without scoping, the chain's second tab instruction would
    // pick `buttons[0]` at document root = the TOP-LEVEL first tab, bouncing
    // the user back to the top tab.
    document.body.innerHTML = `
			<div class="tabs-field" data-testid="top-tabs">
				<button class="tabs-field__tab-button tabs-field__tab-button--active" data-testid="top-hero">Hero</button>
				<button class="tabs-field__tab-button" data-testid="top-content">Content</button>
			</div>
			<div id="layout-row-0">
				<button class="collapsible__toggle" data-testid="row-toggle">Block</button>
				<div class="tabs-field" data-testid="nested-tabs">
					<button class="tabs-field__tab-button" data-testid="nested-0">Primary</button>
					<button class="tabs-field__tab-button tabs-field__tab-button--active" data-testid="nested-1">Secondary</button>
				</div>
			</div>
		`;
    // Wire top-level tabs
    const topHero = document.querySelector<HTMLButtonElement>('[data-testid="top-hero"]')!;
    const topContent = document.querySelector<HTMLButtonElement>('[data-testid="top-content"]')!;
    topContent.addEventListener("click", () => {
      topHero.classList.remove("tabs-field__tab-button--active");
      topContent.classList.add("tabs-field__tab-button--active");
    });
    // Wire nested tabs
    const nested0 = document.querySelector<HTMLButtonElement>('[data-testid="nested-0"]')!;
    const nested1 = document.querySelector<HTMLButtonElement>('[data-testid="nested-1"]')!;
    nested0.addEventListener("click", () => {
      nested1.classList.remove("tabs-field__tab-button--active");
      nested0.classList.add("tabs-field__tab-button--active");
    });

    await applyContainerChain([
      { kind: "tab", tabIndex: 1 },
      { kind: "row", rowContainerId: "layout-row-0" },
      { kind: "tab", tabIndex: 0 },
    ]);
    // Top-level Content still active (did NOT get bounced).
    expect(topContent.classList.contains("tabs-field__tab-button--active")).toBe(true);
    expect(topHero.classList.contains("tabs-field__tab-button--active")).toBe(false);
    // Nested Primary is now active.
    expect(nested0.classList.contains("tabs-field__tab-button--active")).toBe(true);
    expect(nested1.classList.contains("tabs-field__tab-button--active")).toBe(false);
  });
});

describe("applyContainerChain — row instruction", () => {
  it("clicks the toggle inside the row container", async () => {
    document.body.innerHTML = `
			<div id="layout-row-2">
				<button class="collapsible__toggle collapsible__toggle--collapsed">Block</button>
			</div>
		`;
    const toggle = document.querySelector<HTMLButtonElement>(".collapsible__toggle")!;
    toggle.addEventListener("click", () => {
      toggle.classList.remove("collapsible__toggle--collapsed");
    });

    const ok = await applyContainerChain([{ kind: "row", rowContainerId: "layout-row-2" }]);
    expect(ok).toBe(true);
    expect(toggle.classList.contains("collapsible__toggle--collapsed")).toBe(false);
  });
});

describe("expandAndFocus — end-to-end", () => {
  it("focuses a plain input leaf after an empty chain", async () => {
    document.body.innerHTML = '<input id="field-title" />';
    await expandAndFocus([], "field-title");
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(document.activeElement?.id).toBe("field-title");
  });

  it("focuses a Lexical editor reached via label fallback", async () => {
    document.body.innerHTML = `
			<div class="field-type rich-text-lexical">
				<label for="field-layout__0__content">Content</label>
				<div class="rich-text-lexical__wrap">
					<div data-lexical-editor="true" tabindex="0" data-testid="editor"></div>
				</div>
			</div>
		`;
    await expandAndFocus([], "field-layout__0__content");
    await new Promise((resolve) => setTimeout(resolve, 500));
    const editor = document.querySelector<HTMLElement>('[data-testid="editor"]');
    expect(document.activeElement).toBe(editor);
  });

  it("returns cleanly when a chain step times out", async () => {
    // No tab button ever appears; executor soft-fails.
    document.body.innerHTML = "";
    const ok = await applyContainerChain([{ kind: "tab", tabIndex: 0 }]);
    expect(ok).toBe(false);
  }, 10_000);
});
