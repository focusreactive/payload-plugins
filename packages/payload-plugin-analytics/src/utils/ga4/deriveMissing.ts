import type { CustomRegistrationKey } from "../../types/query";

const CUSTOM_KEY_PATTERNS: Array<{ key: CustomRegistrationKey; regex: RegExp }> = [
  { key: "fr_session_id", regex: /customEvent:fr_session_id/ },
  { key: "fr_event_seq", regex: /customEvent:fr_event_seq/ },
  { key: "fr_elapsed_ms", regex: /(?:average)?[cC]ustomEvent:fr_elapsed_ms/ },
  { key: "fr_session_start", regex: /customEvent:fr_session_start/ },
  { key: "fr_lead_type", regex: /customEvent:fr_lead_type/ },
];

export interface DerivableError {
  message: string;
}

export function deriveMissing(err: DerivableError, candidates: CustomRegistrationKey[]): CustomRegistrationKey[] {
  for (const { key, regex } of CUSTOM_KEY_PATTERNS) {
    if (regex.test(err.message) && candidates.includes(key)) return [key];
  }

  return candidates;
}
