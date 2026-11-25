// Runtime helpers over the vocabulary, safe in the client bundle (no Payload imports): titles in
// the reader's language, and which history entries this version knows.

import type { KnownWorkflowEvent, Label, WorkflowEvent } from "./types.js";

/**
 * A title in `language`: a string as is; a per-language record in that language, else English,
 * else its first value. `undefined` when there is none.
 */
export const labelText = (label: Label | undefined, language?: string): string | undefined => {
  if (label === undefined || typeof label === "string") {
    return label;
  }
  return (
    (language === undefined ? undefined : label[language]) ?? label.en ?? Object.values(label)[0]
  );
};

/** The entry types this version writes; anything else was written by a later version. */
export const KNOWN_EVENT_TYPES: readonly KnownWorkflowEvent["type"][] = [
  "started",
  "action",
  "transition",
  "effect",
  "completed",
  "aborted",
  "guard-bypassed",
  "published",
];

/** Narrow an entry to the types this version knows; show or skip the others. */
export const isKnownEvent = (event: WorkflowEvent): event is KnownWorkflowEvent =>
  (KNOWN_EVENT_TYPES as readonly string[]).includes(event.type);
