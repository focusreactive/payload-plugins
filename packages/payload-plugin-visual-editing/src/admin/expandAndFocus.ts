import type { ContainerInstruction } from "./resolveContainerChain.js";

const FOCUS_SELECTOR = '[data-lexical-editor="true"], input:not([type="hidden"]), textarea';

const SWEEP_STYLE_ID = "ve-sweep-styles";
const POLL_INTERVAL_MS = 60;
const STEP_BUDGET_MS = 1500;
const POST_SCROLL_DELAY_MS = 500;

const REVEAL_TOTAL_MS = 1800;

// Focus-reveal accent. HSL so alpha variants share a stable hue/sat/lightness
// — swap the three numbers to re-theme the whole reveal (ring, corners, sweep,
// reduced-motion fallback) in one place.
// Current: electric cyan (≈ #22d3ee).
const FOCUS_HSL = { h: 189, s: 85, l: 53 } as const;
const focusColor = (alpha: number): string =>
  `hsla(${FOCUS_HSL.h}, ${FOCUS_HSL.s}%, ${FOCUS_HSL.l}%, ${alpha})`;

const ensureSweepStyles = (): void => {
  // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
  if (document.getElementById(SWEEP_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = SWEEP_STYLE_ID;
  // Viewport-fixed ornament anchored to the field's bounding rect via RAF. Not
  // injected into the field's subtree: adding `position: relative; overflow: hidden`
  // to arbitrary Payload field wrappers breaks Lexical's sticky toolbar positioning.
  // Layers: corner brackets (reticle), ring (pulsing border + glow halo), sweep (gradient pass).
  style.textContent = `
		@keyframes ve-focus-corner-in {
			0%   { transform: scale(1.35); opacity: 0; }
			60%  { opacity: 1; }
			100% { transform: scale(1);   opacity: 1; }
		}
		@keyframes ve-focus-ring-pulse {
			0%   { box-shadow: 0 0 0 0 ${focusColor(0.55)}, 0 0 0 0 ${focusColor(0.22)}; border-color: ${focusColor(0.95)}; }
			50%  { box-shadow: 0 0 0 4px ${focusColor(0.3)}, 0 0 0 14px ${focusColor(0.06)}; border-color: ${focusColor(0.95)}; }
			100% { box-shadow: 0 0 0 0 ${focusColor(0)}, 0 0 0 0 ${focusColor(0)}; border-color: ${focusColor(0)}; }
		}
		@keyframes ve-focus-sweep {
			0%   { transform: translateY(-100%); opacity: 0; }
			18%  { opacity: 1; }
			100% { transform: translateY(100%);  opacity: 0; }
		}
		@keyframes ve-focus-fadeout {
			to { opacity: 0; }
		}
		.ve-sweep-wrap {
			pointer-events: none;
			position: fixed;
			z-index: 9999;
		}
		.ve-sweep-ring {
			position: absolute;
			inset: -2px;
			border: 2px solid transparent;
			border-radius: 6px;
			animation: ve-focus-ring-pulse 0.7s cubic-bezier(0.4, 0, 0.2, 1) 120ms 2 forwards;
		}
		.ve-sweep-corner {
			position: absolute;
			width: 14px;
			height: 14px;
			border-color: ${focusColor(0.95)};
			border-style: solid;
			border-width: 0;
			animation:
				ve-focus-corner-in 260ms cubic-bezier(0.2, 0.8, 0.2, 1) 0ms both,
				ve-focus-fadeout 300ms ease 1400ms forwards;
		}
		.ve-sweep-corner.tl { top: -4px; left: -4px; border-width: 2px 0 0 2px; border-top-left-radius: 4px; }
		.ve-sweep-corner.tr { top: -4px; right: -4px; border-width: 2px 2px 0 0; border-top-right-radius: 4px; }
		.ve-sweep-corner.bl { bottom: -4px; left: -4px; border-width: 0 0 2px 2px; border-bottom-left-radius: 4px; }
		.ve-sweep-corner.br { bottom: -4px; right: -4px; border-width: 0 2px 2px 0; border-bottom-right-radius: 4px; }
		.ve-sweep-clip {
			position: absolute;
			inset: 0;
			overflow: hidden;
			border-radius: 4px;
		}
		.ve-sweep-overlay {
			position: absolute;
			inset: 0;
			background: linear-gradient(
				to bottom,
				transparent 0%,
				${focusColor(0.06)} 22%,
				${focusColor(0.22)} 50%,
				${focusColor(0.06)} 78%,
				transparent 100%
			);
			animation: ve-focus-sweep 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
		}
		@media (prefers-reduced-motion: reduce) {
			.ve-sweep-ring { animation: none; border-color: ${focusColor(0.9)}; box-shadow: 0 0 0 2px ${focusColor(0.22)}, 0 0 0 6px ${focusColor(0.08)}; }
			.ve-sweep-corner { animation: ve-focus-fadeout 300ms ease 1400ms forwards; }
			.ve-sweep-overlay { animation: none; opacity: 0; }
		}
	`;
  document.head.append(style);
};

const SWEEP_DECORATION_PAD = 24;

export const playSweep = (el: HTMLElement): void => {
  ensureSweepStyles();
  const wrap = document.createElement("div");
  wrap.className = "ve-sweep-wrap";

  const docHeader = document.querySelector<HTMLElement>(".doc-controls");

  const ring = document.createElement("div");
  ring.className = "ve-sweep-ring";

  const corners = (["tl", "tr", "bl", "br"] as const).map((pos) => {
    const corner = document.createElement("div");
    corner.className = `ve-sweep-corner ${pos}`;
    return corner;
  });

  const clip = document.createElement("div");
  clip.className = "ve-sweep-clip";
  const overlay = document.createElement("div");
  overlay.className = "ve-sweep-overlay";
  clip.append(overlay);

  wrap.append(ring, ...corners, clip);
  document.body.append(wrap);

  // Track the field's current rect for the full reveal. If the browser's smooth-scroll
  // is still running when the reveal starts, or the layout shifts mid-animation, the
  // wrap stays anchored to the field instead of drifting off.
  let rafId = 0;
  const pad = SWEEP_DECORATION_PAD;
  const track = () => {
    const rect = el.getBoundingClientRect();
    wrap.style.top = `${rect.top}px`;
    wrap.style.left = `${rect.left}px`;
    wrap.style.width = `${rect.width}px`;
    wrap.style.height = `${rect.height}px`;

    const headerBottom = docHeader?.getBoundingClientRect().bottom ?? 0;
    const topClip = Math.max(headerBottom - rect.top, -pad);
    wrap.style.clipPath = `polygon(${-pad}px ${topClip}px, calc(100% + ${pad}px) ${topClip}px, calc(100% + ${pad}px) calc(100% + ${pad}px), ${-pad}px calc(100% + ${pad}px))`;

    rafId = requestAnimationFrame(track);
  };
  track();

  setTimeout(() => {
    cancelAnimationFrame(rafId);
    wrap.remove();
  }, REVEAL_TOTAL_MS);
};

// Lexical rich-text wrappers don't carry the `field-<path>` id — only a
// `<label htmlFor="field-<path>">` pointing inside. Everything else Payload
// renders exposes the id on an element (input, select, textarea, group wrapper).
export const findFieldElement = (fieldId: string): HTMLElement | null => {
  // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
  const direct = document.getElementById(fieldId);
  if (direct) return direct;
  const label = document.querySelector<HTMLElement>(`label[for="${fieldId}"]`);
  const wrapper = label?.closest<HTMLElement>(".field-type");
  return wrapper ?? null;
};

// Payload lazily renders groups that are below the viewport — their inner fields
// (including the `*-row-<n>` containers the `row` instruction waits on) don't
// exist in the DOM until the group is scrolled near. Before waiting, walk up
// the path and scroll the deepest already-mounted ancestor into view so the
// virtualized subtree hydrates. Safe to call repeatedly; does nothing when the
// full field id is already present.
export const scrollNearestAncestorIntoView = (fieldId: string): void => {
  if (!fieldId.startsWith("field-")) return;
  const segments = fieldId.slice("field-".length).split("__");
  for (let i = segments.length; i > 0; i--) {
    // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
    const el = document.getElementById(`field-${segments.slice(0, i).join("__")}`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "auto", block: "center" });
      return;
    }
  }
};

const waitFor = (predicate: () => boolean, budgetMs: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const deadline = Date.now() + budgetMs;
    const tick = () => {
      if (predicate()) return resolve(true);
      if (Date.now() >= deadline) return resolve(false);
      setTimeout(tick, POLL_INTERVAL_MS);
    };
    tick();
  });
};

// Payload's Collapsible uses its `path` as the id suffix — see
// @payloadcms/ui/dist/fields/Collapsible/index.js:52.
const collapsibleDomId = (path: string): string => `field-collapsible-${path.replace(/\./g, "__")}`;

// Tab buttons can exist at multiple nesting levels (top-level tabs, plus any
// nested tabs fields inside blocks). A raw `querySelectorAll` at document scope
// would match all of them, and `buttons[instruction.tabIndex]` would pick the
// wrong one for any chain step past the top level. The executor narrows the
// search scope as it descends — each row instruction sets the next scope to
// the row's container so subsequent tab/collapsible lookups stay inside it.
const runInstruction = async (
  instruction: ContainerInstruction,
  scope: ParentNode
): Promise<{ ok: boolean; nextScope: ParentNode }> => {
  switch (instruction.kind) {
    case "tab": {
      const getButton = (): HTMLButtonElement | null => {
        const buttons = scope.querySelectorAll<HTMLButtonElement>(".tabs-field__tab-button");
        return buttons[instruction.tabIndex] ?? null;
      };
      const isActive = () =>
        getButton()?.classList.contains("tabs-field__tab-button--active") ?? false;

      const ready = await waitFor(() => getButton() !== null, STEP_BUDGET_MS);
      if (!ready) return { ok: false, nextScope: scope };
      if (!isActive()) getButton()!.click();
      const activated = await waitFor(isActive, STEP_BUDGET_MS);
      return { ok: activated, nextScope: scope };
    }
    case "collapsible": {
      // Collapsible ids are globally unique in the DOM — resolve at document scope.
      const id = collapsibleDomId(instruction.path);
      // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
      const ready = await waitFor(() => document.getElementById(id) !== null, STEP_BUDGET_MS);
      if (!ready) return { ok: false, nextScope: scope };
      // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
      const wrapper = document.getElementById(id)!;
      const toggle = wrapper.querySelector<HTMLButtonElement>(".collapsible__toggle");
      if (!toggle) return { ok: true, nextScope: wrapper };
      if (toggle.classList.contains("collapsible__toggle--collapsed")) {
        toggle.click();
        const opened = await waitFor(
          () => !toggle.classList.contains("collapsible__toggle--collapsed"),
          STEP_BUDGET_MS
        );
        return { ok: opened, nextScope: wrapper };
      }
      return { ok: true, nextScope: wrapper };
    }
    case "row": {
      // `rowContainerId` mirrors the path shape (`a-b-c-row-<n>`). Derive the
      // parent array's field id and scroll it into view to force Payload to
      // hydrate the virtualized rows before we wait for the row container.
      const parentArrayFieldId = `field-${instruction.rowContainerId
        .replace(/-row-\d+$/, "")
        .replace(/-/g, "__")}`;
      scrollNearestAncestorIntoView(parentArrayFieldId);
      const ready = await waitFor(
        // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
        () => document.getElementById(instruction.rowContainerId) !== null,
        STEP_BUDGET_MS
      );
      if (!ready) return { ok: false, nextScope: scope };
      // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
      const row = document.getElementById(instruction.rowContainerId)!;
      const toggle = row.querySelector<HTMLButtonElement>(".collapsible__toggle");
      if (!toggle) return { ok: true, nextScope: row };
      if (toggle.classList.contains("collapsible__toggle--collapsed")) {
        toggle.click();
        const opened = await waitFor(
          () => !toggle.classList.contains("collapsible__toggle--collapsed"),
          STEP_BUDGET_MS
        );
        return { ok: opened, nextScope: row };
      }
      return { ok: true, nextScope: row };
    }
  }
};

export const applyContainerChain = async (
  chain: readonly ContainerInstruction[]
): Promise<boolean> => {
  let scope: ParentNode = document;
  for (const instruction of chain) {
    const result = await runInstruction(instruction, scope);
    if (!result.ok) return false;
    scope = result.nextScope;
  }
  return true;
};

// `scrollIntoView({block: 'center'})` beats a precomputed `scrollBy` delta here:
// the browser tracks the element's live rect across the smooth-scroll animation,
// so virtualized fields hydrating mid-scroll (RenderIfInViewport firing as we
// pass its rootMargin) can't leave us off-target. `.focus({preventScroll: true})`
// suppresses the browser's default "scroll focusable into nearest view" that
// would otherwise race our centering call. After POST_SCROLL_DELAY_MS the
// initial scroll should be settled — if additional virtualization shifted the
// field out of view we re-center once more.
const focusAndSweep = (fieldEl: HTMLElement): void => {
  if (typeof fieldEl.scrollIntoView === "function") {
    fieldEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  setTimeout(() => {
    let sweepTarget: HTMLElement = fieldEl;
    if (fieldEl.matches(FOCUS_SELECTOR)) {
      fieldEl.focus({ preventScroll: true });
      const wrapper = fieldEl.closest<HTMLElement>(".field-type");
      if (wrapper) sweepTarget = wrapper;
    } else {
      const focusable = fieldEl.querySelector<HTMLElement>(FOCUS_SELECTOR);
      focusable?.focus({ preventScroll: true });
    }
    if (typeof fieldEl.scrollIntoView === "function") {
      const rect = fieldEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      // Re-center only when the field is outside the viewport — don't
      // re-scroll a centered field whose intrinsic height exceeds the
      // viewport (rect.top < 0 AND rect.bottom > viewportHeight is the
      // correctly-centered state for tall fields).
      const outOfView = rect.bottom <= 0 || rect.top >= viewportHeight;
      if (outOfView) {
        fieldEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    playSweep(sweepTarget);
  }, POST_SCROLL_DELAY_MS);
};

// Soft-fails on each step: if a chain step times out we still attempt the
// scroll/focus so the user lands near the target (chain partially works,
// field visible via ancestor scroll).
export const expandAndFocus = async (
  chain: readonly ContainerInstruction[],
  fieldId: string | null
): Promise<void> => {
  await applyContainerChain(chain);
  if (!fieldId) return;
  // After the chain opens the tab/collapsible, the target may still live inside
  // a virtualized group — kick off a scroll to the nearest existing ancestor
  // before polling so Payload hydrates the subtree.
  scrollNearestAncestorIntoView(fieldId);
  const ready = await waitFor(() => findFieldElement(fieldId) !== null, STEP_BUDGET_MS);
  if (!ready) return;
  const fieldEl = findFieldElement(fieldId);
  if (fieldEl) focusAndSweep(fieldEl);
};
