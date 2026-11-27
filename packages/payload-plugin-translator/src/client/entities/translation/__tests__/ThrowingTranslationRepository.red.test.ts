import { describe } from "vitest";

import { ThrowingTranslationRepository } from "./ThrowingTranslationRepository.fixture.js";
import { describeTranslationRepositoryContract } from "./TranslationRepository.contract.js";

// Every case fails here by design; the recorded run is
// docs/plans/artifacts/2026-11-13-repository-red-run.txt. Reproduce with TRANSLATOR_RED_RUN=1.
describe.runIf(process.env.TRANSLATOR_RED_RUN === "1")("red run", () => {
  describeTranslationRepositoryContract("throwing", () => ({
    repository: new ThrowingTranslationRepository(),
    locales: { source: "en", targets: ["de", "fr"] },
  }));
});
