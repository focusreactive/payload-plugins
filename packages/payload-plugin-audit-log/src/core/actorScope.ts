import { AsyncLocalStorage } from "node:async_hooks";
import type { AuditActorInput } from "../types";

const ACTOR_SCOPE = Symbol.for("payload-plugin-audit-log.actorScope");

type GlobalWithActorScope = typeof globalThis & {
  [ACTOR_SCOPE]?: AsyncLocalStorage<AuditActorInput>;
};

function actorScope(): AsyncLocalStorage<AuditActorInput> {
  const shared = globalThis as GlobalWithActorScope;
  shared[ACTOR_SCOPE] ??= new AsyncLocalStorage<AuditActorInput>();
  return shared[ACTOR_SCOPE];
}

export async function withAuditActor<T>(
  actor: AuditActorInput,
  fn: () => T | Promise<T>
): Promise<T> {
  return actorScope().run(actor, fn);
}

export function getScopedAuditActor(): AuditActorInput | undefined {
  return actorScope().getStore();
}
