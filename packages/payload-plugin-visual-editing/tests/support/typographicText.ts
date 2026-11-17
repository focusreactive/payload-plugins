import { vi } from "vitest";

import { markedText } from "./markedData";

const PAGE = { collectionSlug: "page", docId: "1", kind: "collection" } as const;

export const TYPOGRAPHIC_TEXTS: [name: string, text: string][] = [
  ["an em dash", "Blog — Robert Hart"],
  ["an en dash", "2019–2024"],
  ["curly quotes", "“Quoted” and ‘single’"],
  ["an ellipsis", "Read more…"],
  ["a bullet", "• First"],
  ["a no-break space", "10 %"],
  ["a narrow no-break space", "10 %"],
  ["a zero-width space", "Zero​width"],
  ["a joined emoji", "\u{1F469}‍\u{1F4BB} at work"],
];

export const EVERY_TYPOGRAPHIC_TEXT = TYPOGRAPHIC_TEXTS.map(([, text]) => text).join(" ");

export const markedAt = (text: string, path: string): string => markedText(text, { ...PAGE, path });

export const OBSERVER_CALLBACK_LIMIT = 200;

export const SETTLED_OBSERVER_CALLBACKS = 20;

export const countObserverCallbacks = (): (() => number) => {
  const Observer = globalThis.MutationObserver;
  let delivered = 0;
  class CountingObserver extends Observer {
    constructor(callback: MutationCallback) {
      super((records, observer) => {
        delivered += 1;
        if (delivered <= OBSERVER_CALLBACK_LIMIT) callback(records, observer);
      });
    }
  }
  vi.stubGlobal("MutationObserver", CountingObserver);
  return () => delivered;
};

export type AttributeWrite = { name: string; value: string };

export const recordAttributeWrites = (): AttributeWrite[] => {
  const writes: AttributeWrite[] = [];
  const write = Element.prototype.setAttribute;
  vi.spyOn(Element.prototype, "setAttribute").mockImplementation(function setAttribute(
    this: Element,
    name: string,
    value: string
  ) {
    writes.push({ name, value });
    write.call(this, name, value);
  });
  return writes;
};

export type TypographicCard = {
  author: string;
  label: string;
  photo: string;
  photoPath: string;
  title: string;
  titlePath: string;
};

export const PAGE_CARD_COUNT = 150;

export const typographicCards = (count = PAGE_CARD_COUNT): TypographicCard[] =>
  Array.from({ length: count }, (_, index) => {
    const [, text] = TYPOGRAPHIC_TEXTS[index % TYPOGRAPHIC_TEXTS.length] ?? ["", ""];
    return {
      author: `${text} — author ${index}`,
      label: `Blog — ${text} ${index}`,
      photo: `Photo – ${text} ${index}`,
      photoPath: `cards.${index}.photo.alt`,
      title: `${text} … ${index}`,
      titlePath: `cards.${index}.title`,
    };
  });
