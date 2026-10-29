import { getPayload } from "payload";

import config from "./payload.config.js";
import { seedSandboxTree } from "./seedSandboxTree.js";

const defaultLargePageCount = 2000;

/**
 * `SEED_LARGE=1` (or `true`) adds 2,000 pages to one folder, a number adds that many. Without it
 * the seed builds only the small sandbox tree.
 */
const parseLargePageCount = (value: string | undefined): number => {
  if (value === undefined || value === "" || value === "0" || value === "false") {
    return 0;
  }
  const count = Number(value);

  return Number.isInteger(count) && count > 1 ? count : defaultLargePageCount;
};

const payload = await getPayload({ config });

const summary = await seedSandboxTree(payload, {
  largePageCount: parseLargePageCount(process.env.SEED_LARGE),
});

payload.logger.info(
  `Seed finished: sandbox tree ready${summary.largePageCount > 0 ? `, ${summary.largePageCount} archive pages` : ""}`
);
process.exit(0);
