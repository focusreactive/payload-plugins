import { buildDevConfig } from "./buildDevConfig.js";

// The end-to-end test for `admin.treeView: false` starts a second dev server with this variable.
export default buildDevConfig({
  foldersOptions: process.env.FOLDERS_TREE_VIEW === "false" ? { admin: { treeView: false } } : {},
});
