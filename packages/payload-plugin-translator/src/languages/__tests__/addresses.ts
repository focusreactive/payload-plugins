import { walkAddress } from "../../core/domain/content-projection/walkAddress.js";
import type { IdPath, TranslationTarget } from "../../core/traversal/index.js";

export const addressOf = (path: IdPath): string => String(walkAddress(path));

export const addressesOf = (targets: readonly TranslationTarget[]): string[] =>
  targets.map((target) => addressOf(target.idPath));
