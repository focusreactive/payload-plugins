import { vercelStegaCombine, vercelStegaSplit } from "@vercel/stega";

const SKIP_BY_STEGA_HEURISTIC = false;

export const withMarker = (text: string, payload: object): string =>
  vercelStegaCombine(text, payload, SKIP_BY_STEGA_HEURISTIC);

export const withoutMarker = (text: string): string => vercelStegaSplit(text).cleaned;
