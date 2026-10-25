import type { RequestScope } from "../../shared/payload/RequestScope.shapes.js";
import { swallowOrThrow } from "../../shared/payload/swallowOrThrow.js";

import type {
  AfterSave,
  BeforeTranslation,
  ChainMember,
  RunContribution,
  RunLogger,
} from "./TranslationRun.interface.js";

/**
 * A module is handed `payload` and may query it, so a failure it raises is assumed to have taken
 * the caller's transaction — {@link swallowOrThrow} decides, and the chain does not second-guess it.
 * Adopting a module's failure as harmless would also demote one a module raised deliberately.
 */
async function callModule<T>(
  name: string,
  scope: RequestScope,
  work: () => Promise<T>,
  log: RunLogger
): Promise<T | undefined> {
  return swallowOrThrow(scope, work, (error) =>
    log.error({ err: error, module: name, msg: "translator: a translation module failed" })
  );
}

const withContribution = (
  state: BeforeTranslation,
  contribution: RunContribution
): BeforeTranslation => ({
  ...state,
  moduleState: { ...state.moduleState, ...contribution.moduleState },
});

/**
 * Each module in list order, owed two things the signature cannot state: `moduleState` merges by
 * key, so a module cannot drop a slot it does not own; and a failed module contributes nothing —
 * the chain keeps the state that module was given, never the `undefined` {@link swallowOrThrow}
 * answers with.
 */
export async function runBeforeTranslation(
  modules: readonly ChainMember[],
  state: BeforeTranslation,
  log: RunLogger
): Promise<BeforeTranslation> {
  const { scope } = state;
  let carried = state;
  for (const member of modules) {
    const join = member.beforeTranslation?.bind(member);
    if (!join) continue;
    const contribution = await callModule(member.name, scope, () => join(carried), log);
    carried = contribution ? withContribution(carried, contribution) : carried;
  }
  return carried;
}

export async function runAfterSave(
  modules: readonly ChainMember[],
  state: AfterSave,
  log: RunLogger
): Promise<void> {
  for (const member of modules) {
    const join = member.afterSave?.bind(member);
    if (!join) continue;
    await callModule(member.name, state.scope, () => join(state), log);
  }
}
