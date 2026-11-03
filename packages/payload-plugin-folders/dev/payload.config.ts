import { adminOptionsFromEnv } from "./adminOptionsFromEnv.js";
import { buildDevConfig } from "./buildDevConfig.js";
import { revalidateFrontend } from "./helpers/revalidateFrontend.js";

// The end-to-end tests start a second dev server with one of these variables set: the stock list
// for `admin.treeView: false`, and `FOLDERS_CONFIRM_MOVES` for the confirmation mode of moves.
export default buildDevConfig({
  // `FOLDERS_MCP=true` adds `@payloadcms/plugin-mcp` at `/api/mcp`, for trying agents on the tree.
  mcp: process.env.FOLDERS_MCP === "true",
  publicReads: true,
  foldersOptions: {
    admin: adminOptionsFromEnv(process.env),
    hooks: { afterPathChange: revalidateFrontend },
    // The dev app has @payloadcms/plugin-redirects, so a move also fills its Redirects collection.
    redirects: { mirrorToRedirectsPlugin: true },
  },
});
