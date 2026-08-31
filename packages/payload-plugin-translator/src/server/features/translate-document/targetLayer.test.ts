import { describe, expect, it } from "vitest";

import { resolveTargetLayer } from "./targetLayer";

// The read layer and the write layer must agree, or the write moves content across the boundary
// between draft and live (#102). This is a pure function precisely so that agreement can be checked
// by a table rather than by asserting the arguments handed to a stubbed `payload.update` — the shape
// of assertion that let the original defect reach production.
describe("resolveTargetLayer", () => {
  const resolve = (versions: unknown, publishOnTranslation: boolean) =>
    resolveTargetLayer({
      versions: versions as undefined,
      publishOnTranslation,
      targetLng: "de",
    });

  it.each([
    ["no versions at all", undefined],
    ["versions without drafts", {}],
    ["versions with drafts disabled", { drafts: false }],
  ])("has one layer when the collection has no drafts — %s", (_name, versions) => {
    for (const publish of [false, true]) {
      const layer = resolve(versions, publish);

      expect(layer.readDraft).toBe(false);
      expect(layer.write).toEqual({ autosave: false });
      expect(layer.status).toBeUndefined();
    }
  });

  it("reads and writes the draft layer when not publishing", () => {
    const layer = resolve({ drafts: true }, false);

    expect(layer.readDraft).toBe(true);
    expect(layer.write).toEqual({ draft: true, autosave: false });
    // No `_status`: writing one without `draft` is what used to unpublish the whole document.
    expect(layer.status).toBeUndefined();
  });

  it("reads and writes the published layer when publishing", () => {
    const layer = resolve({ drafts: true }, true);

    expect(layer.readDraft).toBe(false);
    expect(layer.write).toEqual({ publishSpecificLocale: "de", autosave: false });
    // Looks redundant beside publishSpecificLocale; without it a foreign pending draft drags the
    // document back to `draft`.
    expect(layer.status).toBe("published");
  });

  it("turns on autosave only for a draft-mode write on an autosave collection", () => {
    expect(resolve({ drafts: { autosave: true } }, false).write.autosave).toBe(true);
    expect(resolve({ drafts: { autosave: true } }, true).write.autosave).toBe(false);
    expect(resolve({ drafts: { autosave: false } }, false).write.autosave).toBe(false);
  });

  // The invariant the whole change rests on, asserted directly rather than left to two call sites.
  it("never reads one layer while writing the other", () => {
    for (const versions of [undefined, { drafts: true }, { drafts: { autosave: true } }]) {
      for (const publish of [false, true]) {
        const layer = resolve(versions, publish);
        const writesDraft = layer.write.draft === true;

        expect(layer.readDraft).toBe(writesDraft);
      }
    }
  });
});
