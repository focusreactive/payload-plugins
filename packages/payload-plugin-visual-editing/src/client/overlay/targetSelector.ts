import { DATA_VE_TARGET_ATTR } from "./constants.js";
import { targetWithArea } from "./targetArea.js";

function walkAncestors<T>(
  start: Element | null,
  select: (el: Element) => T | null,
  boundary?: Element
): T | null {
  let cur: Element | null = start;
  while (cur) {
    if (boundary && !boundary.contains(cur)) return null;
    const hit = select(cur);
    if (hit) return hit;
    cur = cur.parentElement;
  }
  return null;
}

export type IsShown = (target: HTMLElement) => boolean;

export const shownOncePerFrame = (isShown: IsShown): IsShown => {
  let shown = new WeakMap<HTMLElement, boolean>();
  let frameRequest = 0;
  const forget = () => {
    shown = new WeakMap();
    frameRequest = 0;
  };
  return (target) => {
    const known = shown.get(target);
    if (known !== undefined) return known;
    const isTargetShown = isShown(target);
    shown.set(target, isTargetShown);
    if (frameRequest === 0) frameRequest = requestAnimationFrame(forget);
    return isTargetShown;
  };
};

export function findTargetAncestor(el: Element | null, isShown: IsShown): HTMLElement | null {
  return walkAncestors(el, (cur) => {
    const target =
      cur instanceof HTMLElement && cur.hasAttribute(DATA_VE_TARGET_ATTR)
        ? cur
        : targetWithArea(cur);
    return target && isShown(target) ? target : null;
  });
}

function findButtonOrAnchor(start: Element | null, boundary: Element): Element | null {
  return walkAncestors(
    start,
    (cur) => (cur.tagName === "A" || cur.tagName === "BUTTON" ? cur : null),
    boundary
  );
}

function lowestCommonAncestor(nodes: readonly Node[]): Element | null {
  if (nodes.length === 0) return null;
  const firstParent = nodes[0]!.parentElement;
  if (nodes.length === 1 || !firstParent) return firstParent;
  const otherSets = nodes.slice(1).map((n) => {
    const set = new Set<Element>();
    for (let p: Element | null = n.parentElement; p; p = p.parentElement) set.add(p);
    return set;
  });
  for (let p: Element | null = firstParent; p; p = p.parentElement) {
    if (otherSets.every((s) => s.has(p!))) return p;
  }
  return null;
}

function expandLabelToFormFieldContainer(lca: Element, boundary: Element): Element | null {
  if (lca.tagName !== "LABEL") return null;
  const label = lca as HTMLLabelElement;
  let control: Element | null = null;
  // oxlint-disable-next-line unicorn/prefer-query-selector -- ids are not guaranteed to be valid CSS selectors
  if (label.htmlFor) control = label.ownerDocument.getElementById(label.htmlFor);
  if (!control) control = label.querySelector("input, textarea, select");
  if (!control || label.contains(control)) return null;

  const controlAncestors = new Set<Element>();
  for (let p: Element | null = control; p && boundary.contains(p); p = p.parentElement) {
    controlAncestors.add(p);
  }
  for (
    let p: Element | null = label.parentElement;
    p && boundary.contains(p);
    p = p.parentElement
  ) {
    if (controlAncestors.has(p)) return p;
  }
  return null;
}

export function pickTargetForGroup(nodes: readonly Text[], boundary: Element): Element | null {
  const buttonOrAnchor = findButtonOrAnchor(nodes[0]?.parentElement ?? null, boundary);
  const inside = buttonOrAnchor && nodes.every((n) => buttonOrAnchor.contains(n));
  if (inside) return buttonOrAnchor;

  const lca = lowestCommonAncestor(nodes);
  if (!lca) return null;

  return expandLabelToFormFieldContainer(lca, boundary) ?? lca;
}
