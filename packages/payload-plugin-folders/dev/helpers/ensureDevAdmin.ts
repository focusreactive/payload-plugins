import type { Payload } from "payload";

import { devUser } from "./credentials.js";

/** Creates the dev admin when absent; the dev config's onInit and the seed script both call it. */
export const ensureDevAdmin = async (payload: Payload) => {
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
};
