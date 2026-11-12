import type { ContainerInstruction } from "./resolveContainerChain.js";

import {
  arrayFieldIdOfRow,
  FIELD_ID_PREFIX,
  FIELD_ID_SEPARATOR,
  fieldDomIdOf,
} from "./fieldDomId.js";

const FOCUS_SELECTOR = '[data-lexical-editor="true"], input:not([type="hidden"]), textarea';

const FIELD_WRAPPER_SELECTOR = ".field-type";
const BLOCK_NAME_INPUT_SELECTOR = ".section-title__input";
const FOCUSED_FIELD_FRAME_SELECTOR = ".section-title, .field-type";

const SWEEP_STYLE_ID = "ve-sweep-styles";
const POLL_INTERVAL_MS = 60;
const STEP_BUDGET_MS = 1500;
const POST_SCROLL_DELAY_MS = 500;

const REVEAL_TOTAL_MS = 1800;

const FOCUS_HSL = { h: 189, s: 85, l: 53 } as const;
const focusColor = (alpha: number): string =>
  `hsla(${FOCUS_HSL.h}, ${FOCUS_HSL.s}%, ${FOCUS_HSL.l}%, ${alpha})`;

const ensureSweepStyles = (): void => {
  // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
  if (document.getElementById(SWEEP_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = SWEEP_STYLE_ID;
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

const playSweep = (el: HTMLElement): void => {
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

const blockNameInputOf = (fieldId: string): HTMLElement | null => {
  const inputs = document.querySelectorAll<HTMLInputElement>(BLOCK_NAME_INPUT_SELECTOR);
  return Array.from(inputs).find((input) => fieldDomIdOf(input.name) === fieldId) ?? null;
};

const labelOf = (fieldId: string): HTMLLabelElement | null =>
  Array.from(document.querySelectorAll("label")).find((label) => label.htmlFor === fieldId) ?? null;

export const findFieldElement = (fieldId: string): HTMLElement | null => {
  // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
  const direct = document.getElementById(fieldId);
  if (direct) return direct;
  const wrapper = labelOf(fieldId)?.closest<HTMLElement>(FIELD_WRAPPER_SELECTOR);
  return wrapper ?? blockNameInputOf(fieldId);
};

export const scrollNearestAncestorIntoView = (fieldId: string): void => {
  if (!fieldId.startsWith(FIELD_ID_PREFIX)) return;
  const segments = fieldId.slice(FIELD_ID_PREFIX.length).split(FIELD_ID_SEPARATOR);
  for (let i = segments.length; i > 0; i--) {
    const ancestorId = `${FIELD_ID_PREFIX}${segments.slice(0, i).join(FIELD_ID_SEPARATOR)}`;
    // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
    const el = document.getElementById(ancestorId);
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

const collapsibleDomId = (path: string): string => fieldDomIdOf(`collapsible-${path}`);

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
      scrollNearestAncestorIntoView(arrayFieldIdOfRow(instruction.rowContainerId));
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

const focusAndSweep = (fieldEl: HTMLElement): void => {
  if (typeof fieldEl.scrollIntoView === "function") {
    fieldEl.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  setTimeout(() => {
    let sweepTarget: HTMLElement = fieldEl;
    if (fieldEl.matches(FOCUS_SELECTOR)) {
      fieldEl.focus({ preventScroll: true });
      const wrapper = fieldEl.closest<HTMLElement>(FOCUSED_FIELD_FRAME_SELECTOR);
      if (wrapper) sweepTarget = wrapper;
    } else {
      const focusable = fieldEl.querySelector<HTMLElement>(FOCUS_SELECTOR);
      focusable?.focus({ preventScroll: true });
    }
    if (typeof fieldEl.scrollIntoView === "function") {
      const rect = fieldEl.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const outOfView = rect.bottom <= 0 || rect.top >= viewportHeight;
      if (outOfView) {
        fieldEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
    playSweep(sweepTarget);
  }, POST_SCROLL_DELAY_MS);
};

export const expandAndFocus = async (
  chain: readonly ContainerInstruction[],
  fieldId: string | null
): Promise<void> => {
  await applyContainerChain(chain);
  if (!fieldId) return;
  scrollNearestAncestorIntoView(fieldId);
  const ready = await waitFor(() => findFieldElement(fieldId) !== null, STEP_BUDGET_MS);
  if (!ready) return;
  const fieldEl = findFieldElement(fieldId);
  if (fieldEl) focusAndSweep(fieldEl);
};
