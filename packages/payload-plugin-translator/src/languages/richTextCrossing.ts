/**
 * The convention by which a Payload host hands a rich-text field to whichever language walks it,
 * and is asked back about each embedded node.
 *
 * It belongs to neither side. A host that took these names from one rich-text language could only
 * ever be configured with that language, however general its `languageId` looked; a rich-text
 * language that took them from its host could not serve a second one.
 */

import type { Crossing } from "../core/traversal/index.js";

/**
 * Which of the host's two embed lists an embedded node belongs to.
 *
 * These name the **host's** lists, not any editor's node types: a rich-text language maps whatever
 * its own format calls an embed onto one of these two.
 *
 * @public
 */
export type EmbedKind = "block" | "inlineBlock";

/**
 * Answers, for one embedded node, which language owns its content. Supplied by whoever activated
 * the rich-text language.
 *
 * @param data - the node's own fields object, aliased: the walk writes translations into it.
 * @returns the crossing to make, or `null` to skip the embed **silently** — the rich-text language
 *   then treats the node as none of its own, so nothing reaches `onSelectedWithoutText`.
 * @public
 */
export type EmbedResolver = (
  kind: EmbedKind,
  blockType: string,
  data: Record<string, unknown>
) => Crossing | null;

/**
 * What a host puts in the {@link Crossing} it makes at a rich-text field.
 *
 * `tree` is `unknown` because only the language that walks it knows which format it is in; it is
 * the working copy, and the walk writes into it.
 *
 * @public
 */
export type RichTextContext = {
  tree: unknown;
  embed: EmbedResolver;
};
