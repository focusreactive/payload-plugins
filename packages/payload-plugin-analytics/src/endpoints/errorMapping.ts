import type { CustomRegistrationKey } from "../types/query";

export interface MappedGa4Error {
  status: number;
  message: string;
  setupRequired?: true;
  missingKey?: CustomRegistrationKey;
}

const MISSING_KEY_PATTERNS: Array<{ key: CustomRegistrationKey; regex: RegExp }> = [
  { key: "fr_session_id", regex: /customEvent:fr_session_id/ },
  { key: "fr_event_seq", regex: /customEvent:fr_event_seq/ },
  { key: "fr_elapsed_ms", regex: /(?:average)?[cC]ustomEvent:fr_elapsed_ms/ },
  { key: "fr_session_start", regex: /customEvent:fr_session_start/ },
];

function deriveMissingKey(msg: string): CustomRegistrationKey | undefined {
  for (const { key, regex } of MISSING_KEY_PATTERNS) {
    if (regex.test(msg)) return key;
  }

  return undefined;
}

export function mapGa4Error(err: unknown): MappedGa4Error {
  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("INVALID_ARGUMENT")) {
    const missingKey = deriveMissingKey(msg);

    return {
      status: 400,
      message: msg,
      ...(missingKey ? { setupRequired: true as const, missingKey } : {}),
    };
  }

  if (msg.includes("PERMISSION_DENIED")) {
    return {
      status: 403,
      message: "GA4 service account lacks permission for this property",
    };
  }

  if (msg.includes("RESOURCE_EXHAUSTED")) {
    return {
      status: 429,
      message: "Analytics quota exceeded; try again in a few minutes",
    };
  }

  if (msg.includes("UNAUTHENTICATED")) {
    return {
      status: 500,
      message: "GA4 service account credentials are invalid",
    };
  }

  return {
    status: 500,
    message: msg || "Unknown analytics error",
  };
}
