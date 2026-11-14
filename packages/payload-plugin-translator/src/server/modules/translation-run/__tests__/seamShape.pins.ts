/**
 * Never imported and never run: `check-types` fails if any `@ts-expect-error` below stops being an
 * error.
 *
 * What this file cannot pin: a module that returns the whole run state. A wider object is always
 * assignable to a narrower one and excess-property checking does not reach a return position, so
 * {@link RunContribution} states what the chain reads without being able to refuse more.
 */

// @ts-expect-error the seam is not part of the published surface
import type { TranslationModule } from "../../../../index.js";
// @ts-expect-error nor is the component contract
import type { TranslationComponent } from "../../../../index.js";
// The positive control. Without it a path that stops resolving would satisfy both directives above
// with "cannot find module", and the two types could be published again unnoticed.
import type { TargetSelectionMode } from "../../../../index.js";
import type { ChainMember } from "../index.js";

const _contributesOnlyItsOwn: ChainMember = {
  name: "contributes",
  beforeTranslation: async () => ({ moduleState: { mine: 1 } }),
};

const _contributesNothing: ChainMember = {
  name: "contributes-nothing",
  beforeTranslation: async () => ({}),
};

export type { TargetSelectionMode, TranslationComponent, TranslationModule };
