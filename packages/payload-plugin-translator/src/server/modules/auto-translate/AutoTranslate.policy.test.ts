import { describe, it, expect } from "vitest";

import {
  buildAutoTranslateTasks,
  extractLocaleCodes,
  filterPolicyToKnownLocales,
  makeCollectionPolicyResolver,
  normalizeAutoTranslateConfig,
  passesPublishGate,
  resolvePublishOnTranslation,
} from "./AutoTranslate.policy";
import type { NormalizedAutoTranslatePolicy } from "./AutoTranslate.policy";

const policy = (
  over: Partial<NormalizedAutoTranslatePolicy> = {}
): NormalizedAutoTranslatePolicy => ({
  targets: ["de", "fr"],
  strategy: "overwrite",
  debounceMs: 0,
  ...over,
});

describe("normalizeAutoTranslateConfig", () => {
  it("applies defaults (strategy overwrite, debounce 0)", () => {
    expect(normalizeAutoTranslateConfig({ targets: ["de"] })).toEqual({
      targets: ["de"],
      strategy: "overwrite",
      debounceMs: 0,
      sourceLocale: undefined,
    });
  });

  it("keeps provided values", () => {
    expect(
      normalizeAutoTranslateConfig({
        targets: ["de"],
        strategy: "skip_existing",
        debounceMs: 1000,
        sourceLocale: "en",
      })
    ).toEqual({ targets: ["de"], strategy: "skip_existing", debounceMs: 1000, sourceLocale: "en" });
  });
});

describe("makeCollectionPolicyResolver (v1 — doc ignored)", () => {
  it("resolves a configured slug, null otherwise, regardless of doc", () => {
    const resolve = makeCollectionPolicyResolver(new Map([["posts", policy()]]));
    expect(resolve("posts", { anything: true })).toEqual(policy());
    expect(resolve("pages", {})).toBeNull();
  });
});

describe("passesPublishGate (D8)", () => {
  it("no-drafts collection: any save qualifies", () => {
    expect(passesPublishGate({}, false)).toBe(true);
    expect(passesPublishGate({ _status: "draft" }, false)).toBe(true);
  });
  it("drafts collection: only a published doc qualifies", () => {
    expect(passesPublishGate({ _status: "published" }, true)).toBe(true);
    expect(passesPublishGate({ _status: "draft" }, true)).toBe(false);
    expect(passesPublishGate({}, true)).toBe(false);
  });
});

describe("resolvePublishOnTranslation (D9 — mirror source)", () => {
  it("mirrors the source status", () => {
    expect(resolvePublishOnTranslation({ _status: "published" }, true)).toBe(true);
    expect(resolvePublishOnTranslation({ _status: "draft" }, true)).toBe(false);
    expect(resolvePublishOnTranslation({}, false)).toBe(true);
  });
});

describe("extractLocaleCodes", () => {
  it("returns null when localization is disabled/absent", () => {
    expect(extractLocaleCodes(false)).toBeNull();
    expect(extractLocaleCodes(undefined)).toBeNull();
  });

  it("reads codes from both the string and object locale forms", () => {
    expect(extractLocaleCodes({ locales: ["en", "de"] })).toEqual(new Set(["en", "de"]));
    expect(extractLocaleCodes({ locales: [{ code: "en" }, { code: "fr" }] })).toEqual(
      new Set(["en", "fr"])
    );
  });
});

describe("filterPolicyToKnownLocales", () => {
  const known = new Set(["en", "de", "fr"]);

  it("keeps configured targets and reports the unknown ones", () => {
    const result = filterPolicyToKnownLocales(policy({ targets: ["de", "xx", "fr"] }), known);
    expect(result.policy.targets).toEqual(["de", "fr"]);
    expect(result.droppedTargets).toEqual(["xx"]);
    expect(result.droppedSourceLocale).toBeNull();
  });

  it("drops an unknown sourceLocale override so it falls back to the default", () => {
    const result = filterPolicyToKnownLocales(
      policy({ targets: ["de"], sourceLocale: "zz" }),
      known
    );
    expect(result.policy.sourceLocale).toBeUndefined();
    expect(result.droppedSourceLocale).toBe("zz");
  });

  it("leaves a fully-valid policy untouched (no drops)", () => {
    const p = policy({ targets: ["de", "fr"], sourceLocale: "en" });
    const result = filterPolicyToKnownLocales(p, known);
    expect(result.policy).toEqual(p);
    expect(result.droppedTargets).toEqual([]);
    expect(result.droppedSourceLocale).toBeNull();
  });
});

describe("buildAutoTranslateTasks", () => {
  it("builds one task per target, excluding the source locale", () => {
    const tasks = buildAutoTranslateTasks({
      policy: policy({ targets: ["en", "de", "fr"] }),
      collectionSlug: "posts",
      documentId: "1",
      sourceLocale: "en",
      doc: { _status: "published" },
      hasDrafts: true,
      now: 0,
    });
    expect(tasks.map((t) => t.targetLng)).toEqual(["de", "fr"]);
    expect(tasks[0]).toMatchObject({
      collectionSlug: "posts",
      collectionId: "1",
      sourceLng: "en",
      strategy: "overwrite",
      publishOnTranslation: true,
    });
    expect(tasks[0].waitUntil).toBeUndefined();
  });

  it("sets waitUntil from debounceMs against the injected now", () => {
    const tasks = buildAutoTranslateTasks({
      policy: policy({ debounceMs: 5000 }),
      collectionSlug: "posts",
      documentId: "1",
      sourceLocale: "en",
      doc: { _status: "published" },
      hasDrafts: true,
      now: 1000,
    });
    expect(tasks[0].waitUntil).toEqual(new Date(6000));
  });
});
