import type { FoldersPluginOptions } from "@focus-reactive/payload-plugin-folders";

/**
 * The `admin` plugin options a second e2e dev server asks for through the environment: the stock
 * list (`FOLDERS_TREE_VIEW=false`) and the confirmation mode (`FOLDERS_CONFIRM_MOVES`). Both land
 * in one object, so setting both keeps both.
 */
export const adminOptionsFromEnv = (
  env: Record<string, string | undefined>
): NonNullable<FoldersPluginOptions["admin"]> => {
  const confirmMoves = env.FOLDERS_CONFIRM_MOVES;

  return {
    ...(env.FOLDERS_TREE_VIEW === "false" ? { treeView: false } : {}),
    ...(confirmMoves === "always" || confirmMoves === "never" || confirmMoves === "urlChange"
      ? { confirmMoves }
      : {}),
  };
};
