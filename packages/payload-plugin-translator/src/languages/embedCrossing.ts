/**
 * Owned by neither host nor format, so neither imports the other.
 */

import type { Crossing } from "../traversal/index.js";

/**
 * @public
 */
export type EmbedFlow = "block" | "inline";

/**
 * @public
 */
export type EmbedIdentity = {
  /**
   * What the host knows this embed as, not the format's own node type.
   */
  name: string;
  /**
   * Absent when the format cannot tell block embeds from inline ones. A host that keeps two lists
   * must then answer `null` rather than pick one.
   */
  flow?: EmbedFlow;
  /**
   * The node's own fields, aliased: a walk that crosses in writes translations into it.
   */
  data: Record<string, unknown>;
};

/**
 * Answers which language owns one embedded node's content. Supplied by whoever activated the
 * format.
 *
 * @returns the crossing to make, or `null` to skip the embed **silently** — the format then treats
 *   the node as none of its own, so nothing reaches `onSelectedWithoutText`.
 * @public
 */
export type EmbedResolver = (embed: EmbedIdentity) => Crossing | null;
