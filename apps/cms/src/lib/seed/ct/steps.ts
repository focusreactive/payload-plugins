import type { SeedStep, StepName } from "./context";
import { seedMedia } from "./seedMedia";
import { seedPosts } from "./seedPosts";
import { seedTaxonomy } from "./seedTaxonomy";
import { seedUsers } from "./seedUsers";

/** Step registry; pages, chrome, redirects and presets arrive in T8–T9. */
export const STEPS: Partial<Record<StepName, SeedStep>> = {
  media: seedMedia,
  posts: seedPosts,
  taxonomy: seedTaxonomy,
  users: seedUsers,
};
