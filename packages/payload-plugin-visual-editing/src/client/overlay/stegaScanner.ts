import type { VeIdentity } from "../../internal/shared.js";

import { vercelStegaDecode } from "@vercel/stega";

import { fromStegaPayload } from "../../internal/shared.js";
import { STEGA_ATTRS, STEGA_PREFILTER } from "./constants.js";

export type TextMatch = VeIdentity & { textNode: Text };
export type AttrMatch = { el: Element; attr: string; value: string };

// Tags whose text content is never user-facing and must not produce edit targets.
// `<script>` routinely contains stega via JSON.stringify output (JSON-LD, RSC streams);
// decoding those payloads drags real H1/H4 targets up to a common ancestor. `<style>`
// and `<noscript>` are skipped for the same reason — they aren't hoverable content.
const SKIP_TEXT_PARENT_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);

export function collectTextMatches(root: Element): TextMatch[] {
  const matches: TextMatch[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const parent = node.parentElement;
      if (parent && SKIP_TEXT_PARENT_TAGS.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent ?? "";
    if (!STEGA_PREFILTER.test(text)) continue;
    const id = fromStegaPayload(vercelStegaDecode(text));
    if (!id) continue;
    matches.push({ textNode: node as Text, ...id });
  }
  return matches;
}

export function collectAttrMatches(root: Element): AttrMatch[] {
  const result: AttrMatch[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  for (let el = walker.nextNode(); el; el = walker.nextNode()) {
    const element = el as Element;
    for (const attr of Array.from(element.attributes)) {
      if (!STEGA_ATTRS.has(attr.name)) continue;
      if (STEGA_PREFILTER.test(attr.value)) {
        result.push({ el: element, attr: attr.name, value: attr.value });
      }
    }
  }
  return result;
}
