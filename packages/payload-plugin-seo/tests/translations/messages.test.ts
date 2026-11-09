import { describe, expect, it } from "vitest";
import { ALL_CHECK_IDS } from "../../src/constants/checkIds";
import { BUNDLED_MESSAGES } from "../../src/translations";
import { en } from "../../src/translations/messages/en";

const PLURAL = /_(zero|one|two|few|many|other)$/u;
const placeholders = (s: string) =>
  [...s.matchAll(/\{\{\s*(\w+)\s*\}\}/gu)].map((m) => m[1]).sort();

/** The English string a translated key corresponds to (a plural form maps to English `_other`). */
const englishFor = (key: string): string | undefined =>
  (en as Record<string, string>)[key] ??
  (en as Record<string, string>)[key.replace(PLURAL, "_other")];

describe("bundled messages", () => {
  it("names every check", () => {
    for (const id of ALL_CHECK_IDS) {
      expect(en).toHaveProperty(`check.${id}.name`);
      expect(en).toHaveProperty(`check.${id}.tip`);
    }
  });

  for (const [language, messages] of Object.entries(BUNDLED_MESSAGES)) {
    describe(language, () => {
      it("has no key English does not have", () => {
        const unknown = Object.keys(messages).filter((key) => englishFor(key) === undefined);
        expect(unknown).toEqual([]);
      });

      it("uses exactly the placeholders English uses", () => {
        for (const [key, value] of Object.entries(messages)) {
          const source = englishFor(key) ?? "";
          expect(placeholders(value), key).toEqual(placeholders(source));
        }
      });
    });
  }
});
