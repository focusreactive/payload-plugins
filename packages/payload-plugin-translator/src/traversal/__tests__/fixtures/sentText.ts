import type { TranslationAnswer, TranslationTarget } from "../../contract.js";

/**
 * Throws rather than rendering a target that sent pieces, so a case written about plain text
 * cannot quietly pass once its value starts travelling as pieces.
 */
export const sentTextOf = (target: TranslationTarget): string => {
  if (target.kind === "text") return target.text;
  throw new Error(`target at ${String(target.idPath)} sent pieces, not text`);
};

export const sentTextsOf = (targets: readonly TranslationTarget[]): string[] =>
  targets.map(sentTextOf);

export type PieceMarkers = { noText: string; join: string };

export const UNWRITABLE_MARKERS: PieceMarkers = { noText: "\u0000", join: "\u0001" };

export const READABLE_MARKERS: PieceMarkers = { noText: "~", join: "|" };

export const sentOf = (target: TranslationTarget, markers: PieceMarkers): string =>
  target.kind === "text"
    ? target.text
    : target.pieces.map((piece) => piece.text ?? markers.noText).join(markers.join);

export const sentsOf = (targets: readonly TranslationTarget[], markers: PieceMarkers): string[] =>
  targets.map((target) => sentOf(target, markers));

export const answerInKind = (
  target: TranslationTarget,
  translate: (text: string) => string
): TranslationAnswer =>
  target.kind === "text"
    ? translate(target.text)
    : target.pieces.map((piece) => ({
        id: piece.id,
        text: piece.text === null ? null : translate(piece.text),
      }));
