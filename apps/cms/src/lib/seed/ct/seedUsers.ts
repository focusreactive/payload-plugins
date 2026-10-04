import { emptyResult } from "./context";
import type { SeedStep } from "./context";

/** Demo accounts (§5.7); password from SEED_DEMO_PASSWORD (default ct-demo). */
const DEMO_USERS = [
  { email: "admin@ct.demo", name: "Demo Admin", role: "admin" },
  { email: "editor@ct.demo", name: "Demo Editor", role: "user" },
  { email: "author@ct.demo", name: "Demo Author", role: "author" },
] as const;

export const seedUsers: SeedStep = async (ctx) => {
  const result = emptyResult();
  const password = process.env.SEED_DEMO_PASSWORD || "ct-demo";

  for (const user of DEMO_USERS) {
    const found = await ctx.payload.find({
      collection: "users",
      limit: 1,
      where: { email: { equals: user.email } },
    });
    if (found.docs[0]) {
      if (found.docs[0].role !== user.role) {
        await ctx.payload.update({
          collection: "users",
          context: ctx.writeContext,
          data: { role: user.role },
          id: found.docs[0].id,
        });
        result.updated++;
      } else {
        result.skipped++;
      }
      continue;
    }
    await ctx.payload.create({
      collection: "users",
      context: ctx.writeContext,
      data: { ...user, password },
    });
    result.created++;
  }
  return result;
};
