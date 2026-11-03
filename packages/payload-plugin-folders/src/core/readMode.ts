import type { User } from "payload";

export type ReadModeArgs = {
  /** Read the latest drafts. Only a signed-in user (or `overrideAccess`) gets them. */
  draft?: boolean;
  /** Default false: access control applies. */
  overrideAccess?: boolean;
  /** Default null: a public read. */
  user?: User | null;
};

export type ReadMode = {
  draft: boolean;
  /** An anonymous read with access control on: the output of a public site. */
  isPublic: boolean;
  overrideAccess: boolean;
  user: User | null;
};

/**
 * How the read helpers (`resolvePath`, `getTree`, `getAllPaths`) read. A draft read is for a reader
 * that is known: an anonymous caller reads published pages whatever it asks for, because a
 * collection's public `read` access says nothing about drafts (spec section 10.1 step 4).
 */
export const resolveReadMode = (args: ReadModeArgs): ReadMode => {
  const overrideAccess = args.overrideAccess ?? false;
  const user = args.user ?? null;

  return {
    draft: Boolean(args.draft) && (overrideAccess || user !== null),
    isPublic: !overrideAccess && user === null,
    overrideAccess,
    user,
  };
};

/** A collection the reader may not read at all answers nothing, not an error. */
export const isForbidden = (error: unknown): boolean =>
  typeof error === "object" && error !== null && (error as { status?: unknown }).status === 403;
