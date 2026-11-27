import type { OurHandlerDid } from "./WhatOurHandlerDid.js";

export type WhyTheLocaleThrew =
  | { kind: "the-queue-failed-before-us" }
  | { kind: "the-work-landed" }
  | { kind: "the-translation-failed"; error: unknown };

/**
 * What a throw that reached the workflow means for one locale, read from how far this plugin's own
 * handler got with it. The throw itself cannot say: the queue re-raises its own bookkeeping error
 * over work that finished, and raises its own failures over work that never started.
 */
export function whatALocalesThrowMeans(
  ours: OurHandlerDid | undefined,
  thrown: unknown
): WhyTheLocaleThrew {
  if (ours === undefined) return { kind: "the-queue-failed-before-us" };
  if (ours.kind === "translated") return { kind: "the-work-landed" };
  if (ours.kind === "failed") return { kind: "the-translation-failed", error: ours.error };
  return { kind: "the-translation-failed", error: thrown };
}
