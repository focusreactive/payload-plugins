import { getPayload } from "payload";

import config from "./payload.config.js";
import { devUser } from "./helpers/credentials.js";

/** The Storyblok sandbox tree arrives with P-30; for now the seed only guarantees the dev admin. */
const payload = await getPayload({ config });

const { totalDocs } = await payload.count({
  collection: "users",
  overrideAccess: true,
  where: { email: { equals: devUser.email } },
});

if (totalDocs === 0) {
  await payload.create({
    collection: "users",
    data: { ...devUser, role: "admin" },
    overrideAccess: true,
  });
}

payload.logger.info("Seed finished");
process.exit(0);
