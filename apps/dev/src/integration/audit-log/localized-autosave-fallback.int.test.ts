import { describe } from "vitest";

import { describeLocalizedAutosavePublishes } from "./localizedAutosaveCases";

describe("publishing after autosaves in other locales with a fallback locale", () => {
  describeLocalizedAutosavePublishes(true);
});
