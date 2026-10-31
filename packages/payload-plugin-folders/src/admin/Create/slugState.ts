import { slugify } from "../../core/slugify.js";

/**
 * The URL segment field of the create dialogs: it follows the name or title typed above it, until
 * the editor types in it (spec section 7.7). The link icon makes it follow again.
 */
export type SlugState = {
  /** The segment follows the source text. */
  isLinked: boolean;
  value: string;
};

export const initialSlugState: SlugState = { isLinked: true, value: "" };

/** The source text changed: a linked segment follows it, an edited one stays as typed. */
export const slugAfterSourceChange = (state: SlugState, source: string): SlugState =>
  state.isLinked ? { isLinked: true, value: slugify(source) } : state;

/** The editor typed in the field: it is theirs now, whatever it says. */
export const slugAfterEdit = (value: string): SlugState => ({ isLinked: false, value });

/** The link icon: the segment is made from the source text again. */
export const slugAfterRelink = (source: string): SlugState => ({
  isLinked: true,
  value: slugify(source),
});
