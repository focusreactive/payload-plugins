import { LABEL_CLASS, STEGA_PREFILTER } from "./constants.js";

export type MutationPipelineCallbacks = {
  /** Called with a minimal, de-duplicated set of roots to rescan. No root contains another. */
  onRoots(roots: Element[]): void;
  /** Called when React rewrote a stega-bearing value on top of a previously cleaned node. */
  onTextReset(node: Text): void;
};

export interface MutationPipeline {
  dispose(): void;
}

// Coalesces mutation bursts into a single microtask-scheduled flush, then drops descendants of
// already-kept ancestors so callers receive a minimal set of roots to rescan.
export function createMutationPipeline(
  root: Element,
  callbacks: MutationPipelineCallbacks
): MutationPipeline {
  const pending = new Set<Element>();
  let scheduled = false;

  const flush = () => {
    scheduled = false;
    const connected: Element[] = [];
    for (const node of pending) {
      if (node.isConnected) connected.push(node);
    }
    pending.clear();
    if (connected.length === 0) return;

    // Sort by document order so ancestors come before descendants, then keep each node only
    // when it's not contained by the most recently kept one. Because any descendant of an
    // ancestor A appears contiguously after A in document order, comparing against just the
    // last kept node is sufficient — a previously kept ancestor can't be separated from its
    // descendants by a non-descendant in this traversal.
    connected.sort((a, b) => {
      if (a === b) return 0;
      const pos = a.compareDocumentPosition(b);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
      if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      return 0;
    });
    const kept: Element[] = [];
    for (const node of connected) {
      const last = kept[kept.length - 1];
      if (last && last.contains(node)) continue;
      kept.push(node);
    }
    callbacks.onRoots(kept);
  };

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(flush);
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        for (const node of Array.from(mutation.addedNodes)) {
          if (!(node instanceof Element)) continue;
          // Our own `appendChild(label)` bubbles back through the observer; skip it.
          if (node.classList.contains(LABEL_CLASS)) continue;
          pending.add(node);
        }
      } else if (mutation.type === "characterData") {
        const textNode = mutation.target;
        if (!(textNode instanceof Text)) continue;
        // Our own writes strip stega out; if the prefilter still matches, React has rewritten
        // a fresh stega-bearing value over a node we already processed. Tell the caller so it
        // can drop its bookkeeping before the next scan re-records the new original.
        const text = textNode.textContent ?? "";
        if (!STEGA_PREFILTER.test(text)) continue;
        callbacks.onTextReset(textNode);
        const parent = textNode.parentElement;
        if (parent) pending.add(parent);
      }
    }
    if (pending.size > 0) schedule();
  });
  observer.observe(root, { childList: true, subtree: true, characterData: true });

  return {
    dispose() {
      observer.disconnect();
      pending.clear();
      scheduled = false;
    },
  };
}
