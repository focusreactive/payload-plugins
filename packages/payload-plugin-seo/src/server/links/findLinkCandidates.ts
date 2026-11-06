import { LINK_SNIPPET_RADIUS } from "../../constants";
import type { WordToken } from "../../keyphrases/text";
import { foldText, tokenizeWords } from "../../keyphrases/text";
import type { DocTarget } from "../../keyphrases/docTarget";
import type { LinkMatch } from "../../links/types";

export interface LinkSource extends DocTarget {
  phrases: string[];
}

export interface LinkCandidate extends DocTarget, LinkMatch {}

interface TextToken extends WordToken {
  folded: string;
  gap: string;
}

interface PhraseEntry {
  phrase: string;
  key: string;
  prefixes: string[];
}

interface SourceEntries {
  source: LinkSource;
  entries: PhraseEntry[];
}

interface PhraseIndex {
  phrases: Map<string, PhraseEntry[]>;
  prefixes: Set<string>;
  maxWords: number;
}

interface PhraseHit {
  entry: PhraseEntry;
  count: number;
  first: TextToken;
  firstIndex: number;
  last: TextToken;
  lastIndex: number;
  coveredUntil: number;
}

const KEY_SEPARATOR = "\u0000";

function normalizeGap(gap: string): string {
  return gap
    .replace(/\p{Pd}/gu, "-")
    .replace(/[’ʼ]/gu, "'")
    .replace(/[\s-]+/gu, " ");
}

function readTokens(text: string): TextToken[] {
  let previousEnd = 0;

  return tokenizeWords(text).flatMap((token) => {
    const folded = foldText(token.word);
    if (!folded) return [];

    const gap = normalizeGap(text.slice(previousEnd, token.start));
    previousEnd = token.end;

    return [{ ...token, folded, gap }];
  });
}

function extendKey(key: string, token: TextToken, isFirst: boolean): string {
  return isFirst
    ? token.folded
    : `${key}${KEY_SEPARATOR}${token.gap}${KEY_SEPARATOR}${token.folded}`;
}

function prefixKeys(phrase: string): string[] {
  let key = "";

  return readTokens(phrase).map((token, position) => {
    key = extendKey(key, token, position === 0);
    return key;
  });
}

function toSourceEntries(source: LinkSource): SourceEntries {
  const entries = source.phrases.flatMap((phrase) => {
    const prefixes = prefixKeys(phrase);
    const key = prefixes.at(-1);

    return key ? [{ phrase, key, prefixes }] : [];
  });

  return { source, entries };
}

function buildIndex(sources: SourceEntries[]): PhraseIndex {
  const index: PhraseIndex = { phrases: new Map(), prefixes: new Set(), maxWords: 0 };

  for (const entry of sources.flatMap((source) => source.entries)) {
    const bucket = index.phrases.get(entry.key);

    if (bucket) {
      bucket.push(entry);
    } else {
      index.phrases.set(entry.key, [entry]);
      for (const prefix of entry.prefixes) index.prefixes.add(prefix);
      index.maxWords = Math.max(index.maxWords, entry.prefixes.length);
    }
  }

  return index;
}

function record(
  hits: Map<PhraseEntry, PhraseHit>,
  entry: PhraseEntry,
  match: Omit<PhraseHit, "entry" | "count" | "coveredUntil">
): void {
  const hit = hits.get(entry);

  if (!hit) {
    hits.set(entry, { entry, count: 1, ...match, coveredUntil: match.lastIndex });
  } else if (match.firstIndex > hit.coveredUntil) {
    hit.count += 1;
    hit.coveredUntil = match.lastIndex;
  }
}

function scan(tokens: TextToken[], index: PhraseIndex): Map<PhraseEntry, PhraseHit> {
  const hits = new Map<PhraseEntry, PhraseHit>();

  for (const [firstIndex, first] of tokens.entries()) {
    let key = "";

    for (let offset = 0; offset < index.maxWords; offset += 1) {
      const lastIndex = firstIndex + offset;
      const last = tokens[lastIndex];
      if (!last) break;

      key = extendKey(key, last, offset === 0);
      if (!index.prefixes.has(key)) break;

      for (const entry of index.phrases.get(key) ?? []) {
        record(hits, entry, { first, firstIndex, last, lastIndex });
      }
    }
  }

  return hits;
}

function widen(
  tokens: TextToken[],
  index: number,
  edge: TextToken,
  step: number,
  within: (token: TextToken) => boolean
): TextToken {
  let widest = edge;

  for (let i = index + step, next = tokens[i]; next && within(next); i += step, next = tokens[i]) {
    widest = next;
  }

  return widest;
}

const SNIPPET_ELLIPSIS_START = "… ";
const SNIPPET_ELLIPSIS_END = " …";

function collapseSpaces(value: string): string {
  return value.replace(/\s+/gu, " ");
}

function snippetOf(
  text: string,
  tokens: TextToken[],
  hit: PhraseHit
): Pick<LinkMatch, "snippet" | "snippetMatch"> {
  const from = hit.first.start - LINK_SNIPPET_RADIUS;
  const to = hit.last.end + LINK_SNIPPET_RADIUS;
  const start = widen(tokens, hit.firstIndex, hit.first, -1, (token) => token.start >= from);
  const end = widen(tokens, hit.lastIndex, hit.last, 1, (token) => token.end <= to);
  const atStart = start === tokens[0];
  const atEnd = end === tokens.at(-1);
  const before = collapseSpaces(text.slice(atStart ? 0 : start.start, hit.first.start)).trimStart();
  const matched = collapseSpaces(text.slice(hit.first.start, hit.last.end));
  const after = collapseSpaces(text.slice(hit.last.end, atEnd ? text.length : end.end)).trimEnd();
  const lead = atStart ? "" : SNIPPET_ELLIPSIS_START;
  const matchStart = lead.length + before.length;

  return {
    snippet: `${lead}${before}${matched}${after}${atEnd ? "" : SNIPPET_ELLIPSIS_END}`,
    snippetMatch: { start: matchStart, end: matchStart + matched.length },
  };
}

function outranks(a: PhraseHit, b: PhraseHit): boolean {
  if (a.count !== b.count) return a.count > b.count;

  return a.entry.phrase.length > b.entry.phrase.length;
}

function bestHit(entries: PhraseEntry[], hits: Map<PhraseEntry, PhraseHit>): PhraseHit | null {
  let best: PhraseHit | null = null;

  for (const entry of entries) {
    const hit = hits.get(entry);
    if (hit && (!best || outranks(hit, best))) best = hit;
  }

  return best;
}

function byRelevance(a: LinkCandidate, b: LinkCandidate): number {
  return b.count - a.count || b.phrase.length - a.phrase.length;
}

export function findLinkCandidates(text: string, sources: LinkSource[]): LinkCandidate[] {
  const sourceEntries = sources.map(toSourceEntries);
  const tokens = readTokens(text);
  const hits = scan(tokens, buildIndex(sourceEntries));

  return sourceEntries
    .flatMap(({ source, entries }) => {
      const hit = bestHit(entries, hits);
      if (!hit) return [];

      return [
        {
          collection: source.collection,
          docId: source.docId,
          phrase: hit.entry.phrase,
          count: hit.count,
          ...snippetOf(text, tokens, hit),
        },
      ];
    })
    .sort(byRelevance);
}
