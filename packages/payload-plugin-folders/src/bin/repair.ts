// Run with `payload run`, which hands this script the project's environment and finds its config:
//   npx payload run node_modules/@focus-reactive/payload-plugin-folders/dist/bin/repair.js -- --dry-run
// `--dry-run` lists what would change and writes nothing; `--no-redirects` writes no redirect rows.
// It imports the plugin through its package name, so it shares the Payload instance's plugin state
// (options, tree lock) with the config the CLI loads; a relative import would load a second copy.
import { repairTree } from "@focus-reactive/payload-plugin-folders/server";
import { getPayload } from "payload";
import { findConfig } from "payload/node";
import { pathToFileURL } from "node:url";

import { formatRepairReport, parseRepairArguments } from "./repairReport.js";

let exitCode = 0;
try {
  const parsed = parseRepairArguments(process.argv.slice(2));
  const configModule = await import(pathToFileURL(findConfig()).toString());
  const config = await (configModule.default ?? configModule);
  const payload = await getPayload({ config });
  try {
    const result = await repairTree(payload, {
      dryRun: parsed.dryRun,
      redirects: parsed.redirects,
    });
    console.log(formatRepairReport(result));
  } finally {
    await payload.destroy();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  exitCode = 1;
}
process.exit(exitCode);
