import { buildDevConfig } from "./buildDevConfig.js";

// The end-to-end tests start a second dev server with one of these variables set: the stock list
// for `admin.treeView: false`, and `FOLDERS_CONFIRM_MOVES` for the confirmation mode of moves.
const confirmMoves = process.env.FOLDERS_CONFIRM_MOVES;

export default buildDevConfig({
  foldersOptions: {
    ...(process.env.FOLDERS_TREE_VIEW === "false" ? { admin: { treeView: false } } : {}),
    ...(confirmMoves === "always" || confirmMoves === "never" || confirmMoves === "urlChange"
      ? { admin: { confirmMoves } }
      : {}),
  },
});
