/** A tree workspace's own element: the tree view's page, or the sidebar tab. */
const workspaceSelector = ".fr-folders";
const compactWorkspaceSelector = ".fr-folders--compact";

/** There is one of each on a page, and the element exists whether or not the tree is drawn. */
export const workspaceElementOf = (isCompact: boolean): Element | null =>
  document.querySelector(
    isCompact ? compactWorkspaceSelector : `${workspaceSelector}:not(${compactWorkspaceSelector})`
  );

/** The workspace that last had the focus, for a key pressed while the focus is on neither. */
let lastFocusedWorkspace: Element | null = null;

/** The focus entered `workspace`, anywhere in it: it answers the page-wide keys from the body. */
export const rememberFocusedWorkspace = (workspace: Element): void => {
  lastFocusedWorkspace = workspace;
};

/** `workspace` left the page: it no longer is the one that had the focus last. */
export const forgetFocusedWorkspace = (workspace: Element): void => {
  if (lastFocusedWorkspace === workspace) {
    lastFocusedWorkspace = null;
  }
};

/**
 * Whether a key that works from anywhere on the page (Escape, `/`, undo, `M`) is this workspace's.
 * The tree view and the sidebar tab can be on the page together, and each one listens on the
 * document: without this the first one to listen would answer for both. The workspace the key was
 * pressed in answers; with the focus on neither, the one that had it last; with none yet, the tree
 * view, or the tab when the tree view is not on the page.
 */
export const isKeyForWorkspace = (
  workspace: Element | null,
  target: EventTarget | null
): boolean => {
  if (workspace === null) {
    return false;
  }
  const targetWorkspace = target instanceof Element ? target.closest(workspaceSelector) : null;
  if (targetWorkspace !== null) {
    return targetWorkspace === workspace;
  }
  if (lastFocusedWorkspace?.isConnected) {
    return lastFocusedWorkspace === workspace;
  }

  // On an edit view the tab is the only tree, and nobody else would answer.
  return !workspace.matches(compactWorkspaceSelector) || workspaceElementOf(false) === null;
};
