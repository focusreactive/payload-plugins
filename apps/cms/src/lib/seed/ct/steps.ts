import type { SeedStep, StepName } from "./context";
import { seedChrome } from "./seedChrome";
import { seedMedia } from "./seedMedia";
import { seedPosts } from "./seedPosts";
import { seedRedirects } from "./seedRedirects";
import { seedTaxonomy } from "./seedTaxonomy";
import { seedUsers } from "./seedUsers";

/** Step registry; pages and presets arrive in T9. */
export const STEPS: Partial<Record<StepName, SeedStep>> = {
  chrome: seedChrome,
  media: seedMedia,
  posts: seedPosts,
  redirects: seedRedirects,
  taxonomy: seedTaxonomy,
  users: seedUsers,
};
