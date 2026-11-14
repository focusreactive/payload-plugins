import type { Payload } from "payload";

import { ModuleWroteTheRunsOwnDocument } from "./ModuleWroteTheRunsOwnDocument.js";
import type { GuardedWrite } from "./ModuleWroteTheRunsOwnDocument.js";
import type { RunTarget } from "./TranslationRun.interface.js";

const GUARDED: readonly GuardedWrite[] = [
  "create",
  "update",
  "delete",
  "duplicate",
  "restoreVersion",
];

/**
 * The `payload` a chain module is handed: the write operations above, aimed at the run's own
 * collection, reject with {@link ModuleWroteTheRunsOwnDocument}, since a direct write would bypass
 * the checks the routes and the queue apply. Reads, and writes to other collections, pass through.
 *
 * Built by prototype delegation, so own-key enumeration (`Object.keys`, object spread) sees only the
 * guarded methods. `payload.db` reaches the database directly and is not covered.
 */
export function payloadForModules(payload: Payload, target: RunTarget): Payload {
  const refuse = (operation: GuardedWrite, collection: unknown) =>
    collection === target.collection
      ? Promise.reject(new ModuleWroteTheRunsOwnDocument(operation, target.collection))
      : undefined;

  const overrides = Object.fromEntries(
    GUARDED.map((operation) => [
      operation,
      // TypeScript cannot call the union of these overloaded signatures with one argument type.
      (args: { collection?: unknown }) =>
        refuse(operation, args.collection) ??
        (payload[operation] as (a: typeof args) => Promise<unknown>)(args),
    ])
  );

  return Object.assign(Object.create(payload) as Payload, overrides);
}
