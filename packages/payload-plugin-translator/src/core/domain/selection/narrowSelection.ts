import type { LeafAddress } from "../content-projection/idPath.js";

/**
 * One answer to "which leaves belong in this run" — a rule's answer, or the addresses a request
 * named. Complete in itself: an answer lists every address it accepts, not only the ones already in
 * the run.
 */
export type LeafAnswer = readonly LeafAddress[];

/**
 * `start` intersected with every answer, in `start`'s order, each address once. Answers narrow and
 * never add, so their order cannot change the result.
 *
 * No answers leaves `start` itself; an answer accepting nothing empties the run, which is an answer
 * rather than a mistake — it says every leaf is already current.
 */
export type NarrowSelection = (
  start: readonly LeafAddress[],
  answers: readonly LeafAnswer[]
) => LeafAddress[];

export const narrowSelection: NarrowSelection = (start, answers) => {
  const gates = answers.map((addresses) => new Set(addresses));
  const kept = new Set<string>();
  for (const address of start) {
    if (gates.every((gate) => gate.has(address))) kept.add(address);
  }
  return [...kept];
};
