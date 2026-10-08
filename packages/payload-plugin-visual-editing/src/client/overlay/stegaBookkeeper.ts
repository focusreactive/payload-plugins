import { vercelStegaSplit } from "@vercel/stega";

// Per-node bookkeeping. Maps (not arrays) prevent double-stripping — a second
// pass of `vercelStegaSplit` over already-cleaned text returns an empty string,
// which would silently blank real content. The text map also lets us tell our
// own characterData mutations from React's updates: when React rewrites a node
// we previously cleaned, `forgetText` drops the stale entry so the next scan
// re-records the new original.
export interface StegaBookkeeper {
  /** Strips stega from `node` and records its original text. Returns true when newly recorded. */
  recordText(node: Text): boolean;
  /** Strips stega from `el[attr]` and records the original value. Returns true when newly recorded. */
  recordAttr(el: Element, attr: string, rawValue: string): boolean;
  /** Called when React rewrote a stega-bearing value on top of a node we already cleaned. */
  forgetText(node: Text): void;
  /** Restore original stega-bearing text/attrs on every still-connected node. */
  restoreAll(): void;
}

export function createStegaBookkeeper(): StegaBookkeeper {
  const textOriginals = new Map<Text, string>();
  const attrOriginals = new Map<Element, Map<string, string>>();

  return {
    recordText(node) {
      if (textOriginals.has(node)) return false;
      const text = node.textContent ?? "";
      textOriginals.set(node, text);
      node.textContent = vercelStegaSplit(text).cleaned;
      return true;
    },
    recordAttr(el, attr, rawValue) {
      const byAttr = attrOriginals.get(el) ?? new Map<string, string>();
      if (byAttr.has(attr)) return false;
      byAttr.set(attr, rawValue);
      attrOriginals.set(el, byAttr);
      el.setAttribute(attr, vercelStegaSplit(rawValue).cleaned);
      return true;
    },
    forgetText(node) {
      textOriginals.delete(node);
    },
    restoreAll() {
      for (const [node, original] of textOriginals) {
        if (node.isConnected) node.textContent = original;
      }
      for (const [el, byAttr] of attrOriginals) {
        if (!el.isConnected) continue;
        for (const [attr, value] of byAttr) el.setAttribute(attr, value);
      }
    },
  };
}
