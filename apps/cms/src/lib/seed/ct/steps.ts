import type { SeedStep, StepName } from "./context";
import { seedCaseStudies } from "./seedCaseStudies";
import { seedChrome } from "./seedChrome";
import { seedMedia } from "./seedMedia";
import { seedPages } from "./seedPages";
import { seedPosts } from "./seedPosts";
import { seedPresets } from "./seedPresets";
import { seedRedirects } from "./seedRedirects";
import { seedTaxonomy } from "./seedTaxonomy";
import { seedUsers } from "./seedUsers";
import { seedWorkflow } from "./seedWorkflow";

/** Step registry (run order: context.ts STEP_ORDER). */
export const STEPS: Partial<Record<StepName, SeedStep>> = {
  caseStudies: seedCaseStudies,
  chrome: seedChrome,
  media: seedMedia,
  pages: seedPages,
  posts: seedPosts,
  presets: seedPresets,
  redirects: seedRedirects,
  taxonomy: seedTaxonomy,
  users: seedUsers,
  workflow: seedWorkflow,
};
