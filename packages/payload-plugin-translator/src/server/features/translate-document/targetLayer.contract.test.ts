import { describe, expect, it } from "vitest";
import { resolveTargetLayer } from "./targetLayer";
import type { TargetLayer, VersionsSlice } from "./targetLayer";

const LNG = "de";
const noDrafts: TargetLayer = { kind: "no-drafts", write: { autosave: false } };
const draftLayer = ({ autosave }: { autosave: boolean }): TargetLayer => ({
  kind: "drafts",
  write: { draft: true, autosave },
  publish: { publishSpecificLocale: LNG, status: "published" },
});

const CASES: { name: string; versions: VersionsSlice; expected: TargetLayer }[] = [
  { name: "versions absent", versions: undefined, expected: noDrafts },
  { name: "a versions config without drafts", versions: {}, expected: noDrafts },
  { name: "drafts: false", versions: { drafts: false }, expected: noDrafts },
  // `true` turns versions on without a draft layer — the shape that made `publishSpecificLocale`
  // destructive, so it must resolve to `no-drafts`.
  { name: "versions: true", versions: true, expected: noDrafts },
  { name: "drafts: true", versions: { drafts: true }, expected: draftLayer({ autosave: false }) },
  { name: "drafts: {}", versions: { drafts: {} }, expected: draftLayer({ autosave: false }) },
  {
    name: "drafts: { autosave: false }",
    versions: { drafts: { autosave: false } },
    expected: draftLayer({ autosave: false }),
  },
  {
    name: "drafts: { autosave: true }",
    versions: { drafts: { autosave: true } },
    expected: draftLayer({ autosave: true }),
  },
  {
    name: "drafts: { autosave: { interval: 800 } }",
    versions: { drafts: { autosave: { interval: 800 } } },
    expected: draftLayer({ autosave: true }),
  },
];

describe("resolveTargetLayer", () => {
  // `toStrictEqual` pins the exact key set, which is also what proves a `no-drafts` layer carries
  // no publish scope: on Payload 3.84.1 `publishSpecificLocale` against a collection with versions
  // but no drafts drops every other locale from the live row — `{en, de}` became `{de}`, silently.
  it.each(CASES)("$name", ({ versions, expected }) => {
    expect(resolveTargetLayer({ versions, targetLng: LNG })).toStrictEqual(expected);
  });

  it.each(CASES)("$name — the write layer is the same at any locale", ({ versions }) => {
    const de = resolveTargetLayer({ versions, targetLng: "de" });
    const pt = resolveTargetLayer({ versions, targetLng: "pt-BR" });
    expect(pt.kind).toBe(de.kind);
    expect(pt.write).toStrictEqual(de.write);
  });

  it("scopes publishing to the locale it was given", () => {
    const layer = resolveTargetLayer({ versions: { drafts: true }, targetLng: "pt-BR" });
    expect(layer.kind === "drafts" && layer.publish.publishSpecificLocale).toBe("pt-BR");
  });
});
