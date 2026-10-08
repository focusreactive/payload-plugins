import { describe, it, expect } from "vitest";
import { SkipExistingStrategy } from "./SkipExisting.strategy.js";

describe("SkipExistingStrategy", () => {
  const strategy = new SkipExistingStrategy();

  describe("shouldTranslate", () => {
    describe("when sourceValue is empty", () => {
      it("returns false for empty string", () => {
        expect(strategy.shouldTranslate({ sourceValue: "", targetValue: undefined })).toBe(false);
      });

      it("returns false for null", () => {
        expect(strategy.shouldTranslate({ sourceValue: null, targetValue: undefined })).toBe(false);
      });

      it("returns false for undefined", () => {
        expect(strategy.shouldTranslate({ sourceValue: undefined, targetValue: undefined })).toBe(
          false
        );
      });
    });

    describe("when sourceValue is non-empty and targetValue is empty", () => {
      it("returns true when targetValue is undefined", () => {
        expect(strategy.shouldTranslate({ sourceValue: "hello", targetValue: undefined })).toBe(
          true
        );
      });

      it("returns true when targetValue is null", () => {
        expect(strategy.shouldTranslate({ sourceValue: "hello", targetValue: null })).toBe(true);
      });

      it("returns true when targetValue is empty string", () => {
        expect(strategy.shouldTranslate({ sourceValue: "hello", targetValue: "" })).toBe(true);
      });

      it("returns true when targetValue is whitespace-only string", () => {
        expect(strategy.shouldTranslate({ sourceValue: "hello", targetValue: "   " })).toBe(true);
      });
    });

    describe("when sourceValue is non-empty and targetValue exists", () => {
      it("returns false when targetValue is non-empty string", () => {
        expect(strategy.shouldTranslate({ sourceValue: "hello", targetValue: "existing" })).toBe(
          false
        );
      });

      it("returns false when targetValue is non-empty object", () => {
        expect(
          strategy.shouldTranslate({ sourceValue: "hello", targetValue: { key: "value" } })
        ).toBe(false);
      });
    });

    describe("richText handling", () => {
      const emptyLexicalRoot = {
        root: {
          type: "root",
          children: [],
          direction: null,
          format: "",
          indent: 0,
          version: 1,
        },
      };

      const nonEmptyLexicalRoot = {
        root: {
          type: "root",
          children: [
            {
              type: "paragraph",
              children: [{ type: "text", text: "Hello world", version: 1 }],
              direction: "ltr",
              format: "",
              indent: 0,
              version: 1,
            },
          ],
          direction: "ltr",
          format: "",
          indent: 0,
          version: 1,
        },
      };

      it("returns true when targetValue is empty Lexical root", () => {
        expect(
          strategy.shouldTranslate({ sourceValue: "hello", targetValue: emptyLexicalRoot })
        ).toBe(true);
      });

      it("returns false when targetValue is non-empty Lexical root", () => {
        expect(
          strategy.shouldTranslate({ sourceValue: "hello", targetValue: nonEmptyLexicalRoot })
        ).toBe(false);
      });
    });
  });

  describe("a target that is already filled in, and what the receipt says about its source", () => {
    const filled = { sourceValue: "Hello", targetValue: "Hallo" };

    it("refreshes it once the receipt shows the source moved", () => {
      expect(strategy.shouldTranslate({ ...filled, sourceChanged: true })).toBe(true);
    });

    it("leaves it alone while the receipt shows the source is unchanged", () => {
      expect(strategy.shouldTranslate({ ...filled, sourceChanged: false })).toBe(false);
    });

    it("leaves it alone when nothing is known about its source", () => {
      expect(strategy.shouldTranslate({ ...filled, sourceChanged: undefined })).toBe(false);
      expect(strategy.shouldTranslate(filled)).toBe(false);
    });

    it("still refuses an empty source, whatever the receipt says", () => {
      expect(
        strategy.shouldTranslate({ sourceValue: "", targetValue: "Hallo", sourceChanged: true })
      ).toBe(false);
    });

    it("still fills an empty target without needing a receipt", () => {
      expect(strategy.shouldTranslate({ sourceValue: "Hello", targetValue: "" })).toBe(true);
    });
  });
});
