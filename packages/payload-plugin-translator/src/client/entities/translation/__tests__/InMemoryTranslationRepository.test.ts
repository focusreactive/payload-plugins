import { InMemoryTranslationRepository } from "./InMemoryTranslationRepository.fixture.js";
import { describeTranslationRepositoryContract } from "./TranslationRepository.contract.js";

const LOCALES = { source: "en", targets: ["de", "fr"] };

describeTranslationRepositoryContract("in-memory", () => ({
  repository: new InMemoryTranslationRepository(
    [
      { collection: "pages", id: "1" },
      { collection: "pages", id: "2" },
    ],
    LOCALES
  ),
  locales: LOCALES,
}));
