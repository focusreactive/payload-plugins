import { getPayload } from "payload";

import config from "./payload.config.js";
import { ensureDevAdmin } from "./helpers/ensureDevAdmin.js";

/** The Storyblok sandbox tree arrives with P-30; for now the seed only guarantees the dev admin. */
const payload = await getPayload({ config });

await ensureDevAdmin(payload);

payload.logger.info("Seed finished");
process.exit(0);
