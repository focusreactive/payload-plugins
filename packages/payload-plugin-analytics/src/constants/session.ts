export const SESSION_INACTIVITY_MS = 30 * 60_000;

export const SESSION_STORAGE_KEY = "fr_analytics_session";

export const SESSION_PARAM_KEYS = {
  sessionId: "fr_session_id",
  eventSeq: "fr_event_seq",
  elapsedMs: "fr_elapsed_ms",
  sessionStart: "fr_session_start",
} as const;
