import { VERCEL_STEGA_REGEX, vercelStegaCombine, vercelStegaSplit } from "@vercel/stega";

const SKIP_BY_STEGA_HEURISTIC = false;

export const withMarker = (text: string, payload: object): string =>
  vercelStegaCombine(text, payload, SKIP_BY_STEGA_HEURISTIC);

const MARKER = new RegExp(VERCEL_STEGA_REGEX.source, "u");

export const hasMarker = (text: string): boolean => MARKER.test(text);

export const withoutMarker = (text: string): string => vercelStegaSplit(text).cleaned;
