import { adminOptionsFromEnv } from "./adminOptionsFromEnv.js";
import { buildDevConfig } from "./buildDevConfig.js";

// The end-to-end tests start a second dev server with one of these variables set: the stock list
// for `admin.treeView: false`, and `FOLDERS_CONFIRM_MOVES` for the confirmation mode of moves.
export default buildDevConfig({ foldersOptions: { admin: adminOptionsFromEnv(process.env) } });
