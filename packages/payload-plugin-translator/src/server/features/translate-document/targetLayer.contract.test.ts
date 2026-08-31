import { describe, expect, it } from "vitest";
import { resolveTargetLayer } from "./targetLayer";
import type { TargetLayer } from "./targetLayer";
import type { VersionsSlice } from "./targetLayer";

// The layer is a discriminated union, so a field that belongs to one variant cannot be read off
// another. These widen it back for assertions that deliberately span every variant — "no publish
// scope here" is exactly the kind of thing this suite must be able to say about all of them.
const statusOf = (layer: TargetLayer): "published" | undefined =>
  layer.kind === "publish" ? layer.status : undefined;
const draftOf = (layer: TargetLayer): true | undefined =>
  layer.kind === "draft" ? layer.write.draft : undefined;
const publishLocaleOf = (layer: TargetLayer): string | undefined =>
  layer.kind === "publish" ? layer.write.publishSpecificLocale : undefined;

type Case = { name: string; versions: VersionsSlice | undefined };

const LNG = "de";

const NO_DRAFTS: Case[] = [
  { name: "versions absent", versions: undefined },
  { name: "a versions config without drafts", versions: {} },
  { name: "drafts: false", versions: { drafts: false } },
];

const DRAFTS_WITHOUT_AUTOSAVE: Case[] = [
  { name: "drafts: true", versions: { drafts: true } },
  { name: "drafts: {}", versions: { drafts: {} } },
  { name: "drafts: { autosave: false }", versions: { drafts: { autosave: false } } },
];

const DRAFTS_WITH_AUTOSAVE: Case[] = [
  { name: "drafts: { autosave: true }", versions: { drafts: { autosave: true } } },
  {
    name: "drafts: { autosave: { interval: 800 } }",
    versions: { drafts: { autosave: { interval: 800 } } },
  },
];

const WITH_DRAFTS = [...DRAFTS_WITHOUT_AUTOSAVE, ...DRAFTS_WITH_AUTOSAVE];
const ALL_CASES = [...NO_DRAFTS, ...WITH_DRAFTS];

const MATRIX = ALL_CASES.flatMap((c) =>
  [true, false].map((publishOnTranslation) => ({ ...c, publishOnTranslation }))
);

const labelOf = (c: { name: string; publishOnTranslation: boolean }) =>
  `${c.name} / publishOnTranslation=${c.publishOnTranslation}`;

describe("resolveTargetLayer", () => {
  describe("a collection with no draft layer", () => {
    for (const { name, versions } of NO_DRAFTS) {
      for (const publishOnTranslation of [false, true]) {
        const when = `${name}, publishOnTranslation=${publishOnTranslation}`;

        it(`reads the only layer there is (${when})`, () => {
          const layer = resolveTargetLayer({ versions, publishOnTranslation, targetLng: LNG });
          expect(layer.readDraft).toBe(false);
        });

        it(`sends no draft key, because the write is not a draft-layer write (${when})`, () => {
          const layer = resolveTargetLayer({ versions, publishOnTranslation, targetLng: LNG });
          expect("draft" in layer.write).toBe(false);
        });

        it(`never autosaves, because the write is not a draft-layer write (${when})`, () => {
          const layer = resolveTargetLayer({ versions, publishOnTranslation, targetLng: LNG });
          expect(layer.write.autosave).toBe(false);
        });

        // `toStrictEqual` also pins `publishSpecificLocale` absent when publishing a collection
        // with no drafts. That is an interpretation of the contract, not a stated rule: a red here
        // may mean the contract needs deciding, not that the code is wrong.
        it(`sends exactly the single-layer write args (${when})`, () => {
          const layer = resolveTargetLayer({ versions, publishOnTranslation, targetLng: LNG });
          expect(layer.write).toStrictEqual({ autosave: false });
        });

        it(`sends no _status (${when})`, () => {
          const layer = resolveTargetLayer({ versions, publishOnTranslation, targetLng: LNG });
          expect(statusOf(layer)).toBeUndefined();
        });
      }
    }

    for (const { name, versions } of NO_DRAFTS) {
      it(`sends no publishSpecificLocale when not publishing (${name})`, () => {
        const layer = resolveTargetLayer({
          versions,
          publishOnTranslation: false,
          targetLng: LNG,
        });
        expect("publishSpecificLocale" in layer.write).toBe(false);
      });
    }
  });

  describe("drafts enabled, leaving the result as a draft", () => {
    for (const { name, versions } of WITH_DRAFTS) {
      it(`reads the draft layer (${name})`, () => {
        const layer = resolveTargetLayer({
          versions,
          publishOnTranslation: false,
          targetLng: LNG,
        });
        expect(layer.readDraft).toBe(true);
      });

      it(`marks the write as a draft-layer write (${name})`, () => {
        const layer = resolveTargetLayer({
          versions,
          publishOnTranslation: false,
          targetLng: LNG,
        });
        expect(draftOf(layer)).toBe(true);
      });

      it(`sends no publishSpecificLocale, because it is not publishing (${name})`, () => {
        const layer = resolveTargetLayer({
          versions,
          publishOnTranslation: false,
          targetLng: LNG,
        });
        expect("publishSpecificLocale" in layer.write).toBe(false);
      });

      it(`sends no _status on a draft-layer write (${name})`, () => {
        const layer = resolveTargetLayer({
          versions,
          publishOnTranslation: false,
          targetLng: LNG,
        });
        expect(statusOf(layer)).toBeUndefined();
      });
    }

    for (const { name, versions } of DRAFTS_WITHOUT_AUTOSAVE) {
      it(`sends exactly the draft write args, without autosave (${name})`, () => {
        const layer = resolveTargetLayer({
          versions,
          publishOnTranslation: false,
          targetLng: LNG,
        });
        expect(layer.write).toStrictEqual({ draft: true, autosave: false });
      });
    }

    for (const { name, versions } of DRAFTS_WITH_AUTOSAVE) {
      it(`sends exactly the draft write args, with autosave (${name})`, () => {
        const layer = resolveTargetLayer({
          versions,
          publishOnTranslation: false,
          targetLng: LNG,
        });
        expect(layer.write).toStrictEqual({ draft: true, autosave: true });
      });
    }
  });

  describe("drafts enabled, publishing the result", () => {
    for (const { name, versions } of WITH_DRAFTS) {
      it(`reads the published layer (${name})`, () => {
        const layer = resolveTargetLayer({ versions, publishOnTranslation: true, targetLng: LNG });
        expect(layer.readDraft).toBe(false);
      });

      it(`sends no draft key, because publishing is not a draft-layer write (${name})`, () => {
        const layer = resolveTargetLayer({ versions, publishOnTranslation: true, targetLng: LNG });
        expect("draft" in layer.write).toBe(false);
      });

      it(`never autosaves a published-layer write (${name})`, () => {
        const layer = resolveTargetLayer({ versions, publishOnTranslation: true, targetLng: LNG });
        expect(layer.write.autosave).toBe(false);
      });

      it(`sends exactly the publish write args (${name})`, () => {
        const layer = resolveTargetLayer({ versions, publishOnTranslation: true, targetLng: LNG });
        expect(layer.write).toStrictEqual({ publishSpecificLocale: LNG, autosave: false });
      });

      it(`sends _status "published" alongside publishSpecificLocale (${name})`, () => {
        const layer = resolveTargetLayer({ versions, publishOnTranslation: true, targetLng: LNG });
        expect(statusOf(layer)).toBe("published");
      });

      it(`scopes the publish to the locale being translated (${name})`, () => {
        const layer = resolveTargetLayer({
          versions,
          publishOnTranslation: true,
          targetLng: "pt-BR",
        });
        expect(publishLocaleOf(layer)).toBe("pt-BR");
      });
    }
  });

  // Measured on Payload 3.84.1: `publishSpecificLocale` on a collection with `versions: true` but
  // no drafts drops every other locale from the live row — `{en, de}` became `{de}`, with no error
  // and no log. The union makes that combination unbuildable; this is the regression net under it.
  describe("the destructive combination is never produced", () => {
    for (const c of MATRIX) {
      it(`no publish scope without a draft layer (${labelOf(c)})`, () => {
        const layer = resolveTargetLayer({
          versions: c.versions,
          publishOnTranslation: c.publishOnTranslation,
          targetLng: LNG,
        });
        if (layer.kind === "no-drafts") {
          expect(layer.write).not.toHaveProperty("publishSpecificLocale");
        }
        expect(publishLocaleOf(layer) === undefined || layer.kind === "publish").toBe(true);
      });
    }
  });

  describe("the invariant callers depend on", () => {
    for (const c of MATRIX) {
      it(`readDraft is true exactly when write.draft is true (${labelOf(c)})`, () => {
        const layer = resolveTargetLayer({
          versions: c.versions,
          publishOnTranslation: c.publishOnTranslation,
          targetLng: LNG,
        });
        expect(layer.readDraft).toBe(draftOf(layer) === true);
      });
    }

    it("never says 'not a draft' with draft: false", () => {
      for (const c of MATRIX) {
        const layer = resolveTargetLayer({
          versions: c.versions,
          publishOnTranslation: c.publishOnTranslation,
          targetLng: LNG,
        });
        expect(draftOf(layer), labelOf(c)).not.toBe(false);
      }
    });
  });

  describe("pure and total", () => {
    it("never throws, for any combination of inputs", () => {
      for (const c of MATRIX) {
        expect(
          () =>
            resolveTargetLayer({
              versions: c.versions,
              publishOnTranslation: c.publishOnTranslation,
              targetLng: LNG,
            }),
          labelOf(c)
        ).not.toThrow();
      }
    });

    it("returns a layer for every combination of inputs", () => {
      for (const c of MATRIX) {
        const layer = resolveTargetLayer({
          versions: c.versions,
          publishOnTranslation: c.publishOnTranslation,
          targetLng: LNG,
        });
        expect(typeof layer.readDraft, labelOf(c)).toBe("boolean");
        expect(typeof layer.write.autosave, labelOf(c)).toBe("boolean");
      }
    });

    it("chooses the same layer whatever the targetLng", () => {
      for (const c of MATRIX) {
        const shape = (targetLng: string) => {
          const layer = resolveTargetLayer({
            versions: c.versions,
            publishOnTranslation: c.publishOnTranslation,
            targetLng,
          });
          return {
            readDraft: layer.readDraft,
            isDraftWrite: "draft" in layer.write,
            autosave: layer.write.autosave,
            status: statusOf(layer),
          };
        };
        expect(shape("pt-BR"), labelOf(c)).toStrictEqual(shape("de"));
      }
    });
  });
});
