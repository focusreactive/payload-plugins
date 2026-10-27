import { deliveredLocales } from "./deliveredLocales.js";
import type { PayloadJob } from "../store/index.js";

export const stillOwed = (job: PayloadJob, locales: readonly string[]): string[] => {
  const delivered = deliveredLocales(job);
  return locales.filter((locale) => !delivered.has(locale));
};
