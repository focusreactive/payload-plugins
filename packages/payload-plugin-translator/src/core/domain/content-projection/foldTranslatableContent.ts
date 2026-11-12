import { collectTranslationTargets } from "../../traversal/index.js";
import type { CollectOptions, TranslationTarget } from "../../traversal/index.js";
import type { IdPath } from "./idPath.js";
import { walkAddress } from "./walkAddress.js";

export type FoldedField = {
  address: IdPath;
  /**
   * Only the text found below a crossing at this address; the field's own text is not here.
   */
  crossedInText: string;
};

const textOf = (target: TranslationTarget): string =>
  target.kind === "text" ? target.text : target.pieces.map((piece) => piece.text ?? "").join("");

const tookNoCrossing = (target: TranslationTarget): boolean => target.idPath === target.foldPath;

const crossedIntoThisField = (target: TranslationTarget, address: IdPath): boolean =>
  !tookNoCrossing(target) && walkAddress(target.idPath) !== address;

export function foldTranslatableContent(options: CollectOptions): readonly FoldedField[] {
  const byAddress = new Map<IdPath, TranslationTarget[]>();
  for (const target of collectTranslationTargets(options).targets) {
    const address = walkAddress(target.foldPath);
    const beneath = byAddress.get(address);
    if (beneath === undefined) byAddress.set(address, [target]);
    else beneath.push(target);
  }

  return [...byAddress].map(([address, targets]) => ({
    address,
    crossedInText: targets
      .filter((target) => crossedIntoThisField(target, address))
      .map(textOf)
      .join(""),
  }));
}
