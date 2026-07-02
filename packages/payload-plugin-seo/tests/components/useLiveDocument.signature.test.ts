// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";

vi.mock("@payloadcms/ui", () => ({
  useAllFormFields: () => [{}],
  useConfig: () => ({ config: { routes: { api: "/api" } } }),
  useDebounce: (value: unknown) => value,
  useLocale: () => ({ code: "en" }),
}));

const { keyphraseSignature } = await import("../../src/components/SeoDrawer/useLiveDocument");

describe("keyphraseSignature", () => {
  it("changes when a keyphrase or synonym changes, ignoring ids", () => {
    const a = keyphraseSignature([{ text: "payload cms", synonyms: ["payloadcms"] }]);
    const b = keyphraseSignature([{ text: "payload cms", synonyms: ["payloadcms", "payload"] }]);
    const c = keyphraseSignature([{ text: "payload cms", synonyms: ["payloadcms"] }]);
    expect(a).toBe(c);
    expect(a).not.toBe(b);
  });
});
