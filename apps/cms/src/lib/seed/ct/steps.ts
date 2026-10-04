import type { SeedStep, StepName } from "./context";

/** Step registry; T7–T9 fill it in (media, taxonomy, users, posts, pages, chrome, redirects, presets). */
export const STEPS: Partial<Record<StepName, SeedStep>> = {};
