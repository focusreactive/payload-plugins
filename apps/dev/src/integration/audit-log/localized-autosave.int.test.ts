import { describe } from "vitest";

import { describeLocalizedAutosavePublishes } from "./localizedAutosaveCases";

describe("publishing after autosaves in other locales without a fallback locale", () => {
  describeLocalizedAutosavePublishes(false);
});
