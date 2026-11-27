import { VERCEL_STEGA_REGEX, vercelStegaCombine, vercelStegaSplit } from "@vercel/stega";

const SKIP_BY_STEGA_HEURISTIC = false;

export const withMarker = (text: string, payload: unknown): string =>
  vercelStegaCombine(text, payload, SKIP_BY_STEGA_HEURISTIC);

const MARKER = new RegExp(VERCEL_STEGA_REGEX.source, "u");

export const hasMarker = (text: string): boolean => MARKER.test(text);

export const withoutMarker = (text: string): string => vercelStegaSplit(text).cleaned;

const LEADING_WHITESPACE = /^\s*/u;

export const leadingWhitespaceOf = (text: string): string =>
  LEADING_WHITESPACE.exec(text)?.[0] ?? "";

export const textAfterMarker = (text: string): string | null => {
  const found = MARKER.exec(text);
  return found ? withoutMarker(text.slice(found.index + found[0].length)) : null;
};
