import type { CustomRegistrationKey } from "../../types/query";

export const CUSTOM_KEY_PATTERNS: Array<{ key: CustomRegistrationKey; regex: RegExp }> = [
  { key: "fr_session_id", regex: /customEvent:fr_session_id/u },
  { key: "fr_event_seq", regex: /customEvent:fr_event_seq/u },
  { key: "fr_elapsed_ms", regex: /(?:average)?[cC]ustomEvent:fr_elapsed_ms/u },
  { key: "fr_session_start", regex: /customEvent:fr_session_start/u },
  { key: "fr_lead_type", regex: /customEvent:fr_lead_type/u },
  { key: "fr_page_ref", regex: /customEvent:fr_page_ref/u },
  { key: "fr_content_locale", regex: /customEvent:fr_content_locale/u },
];

export interface DerivableError {
  message: string;
}

export function deriveMissing(
  err: DerivableError,
  candidates: CustomRegistrationKey[]
): CustomRegistrationKey[] {
  for (const { key, regex } of CUSTOM_KEY_PATTERNS) {
    if (regex.test(err.message) && candidates.includes(key)) return [key];
  }

  return candidates;
}
