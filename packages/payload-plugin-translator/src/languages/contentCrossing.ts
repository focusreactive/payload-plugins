/**
 * Owned by neither host nor format language, so neither has to import the other.
 */

import type { EmbedResolver } from "./richTextCrossing.js";

/**
 * @public
 */
export type ContentOffer = {
  /**
   * The value to translate from, never a position to write to: the host may read it from one
   * document and keep its translations in another. A format that walks it in place copies it
   * deeply first and names the copy as `workingCopy`.
   */
  value: unknown;
  embed: EmbedResolver;
};

/**
 * @public
 */
export type OpenedCrossing = {
  languageId: string;
  context: unknown;
  /**
   * The copy this format walks. The host places it where it keeps translations, which need not be
   * where the offered value was read, and hands it back as `enter`'s `value`. Absent when the
   * format walks something the host need not place.
   */
  workingCopy?: unknown;
};

/**
 * `null` means "not this format", never "skip": the value goes on to the next crossing, then to
 * the host.
 *
 * @public
 */
export type ContentCrossing = (offer: ContentOffer) => OpenedCrossing | null;
