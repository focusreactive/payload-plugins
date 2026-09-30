import type { BuildAdminEditUrl } from "../buildAdminEditUrl.js";
import type { Marker } from "./markerExtractor.js";
import type { TextMatch } from "./stegaScanner.js";

import { DATA_VE_PATH_ATTR } from "../../constants.js";
import { LABEL_CLASS } from "./constants.js";
import { createEditBadge } from "./editBadge.js";
import { createHoverController } from "./hoverController.js";
import { groupNodesByPath, readMarkerFromAttrs } from "./markerExtractor.js";
import { createMutationPipeline } from "./mutationPipeline.js";
import { createStegaBookkeeper } from "./stegaBookkeeper.js";
import { collectAttrMatches, collectTextMatches } from "./stegaScanner.js";
import { createTargetRegistry } from "./targetRegistry.js";
import { pickTargetForGroup } from "./targetSelector.js";

export type OverlayCtx = {
  buildAdminEditUrl: BuildAdminEditUrl;
  adminOrigin: string;
  adminBasePath: string;
  locale?: string;
  /** 'always' paints outlines on every editable target; 'hover' paints only the hovered one.
   *  'off' is handled by not mounting the overlay at all, so it never reaches this module. */
  mode: "always" | "hover";
};

// Wires every overlay submodule and returns a dispose that tears them down in reverse order.
// `getCtx` is a getter so the callsite (the hook) can stabilize its useEffect dependency array
// on just `[enabled]` while still seeing fresh ctx when a target is registered.
export function createOverlay(main: HTMLElement, getCtx: () => OverlayCtx): () => void {
  // Fast Refresh may skip the cleanup from a previous effect run — purge any leftover labels.
  // Outline and target attrs are owned by the registry now (disposal restores them), so leftover
  // attrs only exist if a crash skipped cleanup entirely; rare enough to not warrant a scan.
  for (const leftover of Array.from(document.querySelectorAll<HTMLElement>(`.${LABEL_CLASS}`))) {
    leftover.remove();
  }

  const bookkeeper = createStegaBookkeeper();
  const registry = createTargetRegistry();
  const badge = createEditBadge();
  const hover = createHoverController(badge, registry);

  const applyOverlay = (target: HTMLElement, marker: Marker): boolean => {
    const existing = registry.get(target);
    if (existing && existing.path === marker.path) return false;
    registry.upsert(target, marker, getCtx());
    if (existing) {
      hover.refresh(target);
    } else {
      hover.attach(target);
    }
    return true;
  };

  const scan = (root: Element) => {
    if (!root.isConnected) return;
    // Our own `appendChild(label)` triggers childList mutations the observer will forward
    // back here. The label has no stega and no wrapper — short-circuit to avoid TreeWalker work.
    if (root.classList?.contains(LABEL_CLASS)) return;

    const newMatches: TextMatch[] = [];
    for (const match of collectTextMatches(root)) {
      if (bookkeeper.recordText(match.textNode)) newMatches.push(match);
    }

    for (const match of collectAttrMatches(root)) {
      bookkeeper.recordAttr(match.el, match.attr, match.value);
    }

    for (const { nodes, ctx: marker } of groupNodesByPath(newMatches)) {
      const target = pickTargetForGroup(nodes, main);
      if (!(target instanceof HTMLElement)) continue;
      applyOverlay(target, marker);
    }

    // Rich text and other renderers that own their own text nodes carry the path on a wrapper
    // attr instead of inline stega.
    const wrappers: HTMLElement[] = [];
    if (root.matches(`[${DATA_VE_PATH_ATTR}]`)) wrappers.push(root as HTMLElement);
    wrappers.push(...Array.from(root.querySelectorAll<HTMLElement>(`[${DATA_VE_PATH_ATTR}]`)));

    for (const target of wrappers) {
      const marker = readMarkerFromAttrs(target);
      if (!marker) continue;
      applyOverlay(target, marker);
    }
  };

  scan(main);

  const pipeline = createMutationPipeline(main, {
    onRoots: (roots) => {
      for (const root of roots) scan(root);
    },
    onTextReset: (node) => bookkeeper.forgetText(node),
  });

  return () => {
    pipeline.dispose();
    hover.dispose();
    registry.disposeAll();
    badge.dispose();
    bookkeeper.restoreAll();
  };
}
