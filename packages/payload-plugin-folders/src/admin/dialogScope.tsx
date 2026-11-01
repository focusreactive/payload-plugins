import { createContext, useContext, useId } from "react";
import type { ReactNode } from "react";

/**
 * Payload keeps the open state of every modal in one place, keyed by slug. The tree view and the
 * sidebar tab can show a tree each at the same time, and both draw the same dialogs: with one slug
 * each, opening a dialog in one would open it in the other too, and the other's stale state would
 * run. Every tree workspace puts its own suffix on each slug it uses.
 */
const DialogScopeContext = createContext("");

export const DialogScopeProvider = ({ children }: { children: ReactNode }) => {
  // useId looks like `:r1:`, which a slug used in selectors and ids should not carry.
  const scope = useId().replaceAll(/[^a-zA-Z0-9]/gu, "");

  return <DialogScopeContext value={`-${scope}`}>{children}</DialogScopeContext>;
};

/** The slug a dialog or drawer of this workspace opens under: unchanged outside any workspace. */
export const useDialogSlug = (slug: string): string => `${slug}${useContext(DialogScopeContext)}`;
