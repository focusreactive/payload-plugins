import { describe, it, expect } from "vitest";

import { getAutoTranslateConfig } from "./getAutoTranslateConfig";
import { AUTO_TRANSLATE_CUSTOM_KEY } from "./types";

const wrap = (value: unknown) => ({ custom: { [AUTO_TRANSLATE_CUSTOM_KEY]: value } });

describe("getAutoTranslateConfig", () => {
  it("returns the config for a well-formed opt-in", () => {
    const config = { targets: ["de", "fr"], strategy: "overwrite" as const };
    expect(getAutoTranslateConfig(wrap(config))).toEqual(config);
  });

  it("returns null when there is no custom bag or no key", () => {
    expect(getAutoTranslateConfig({})).toBeNull();
    expect(getAutoTranslateConfig({ custom: {} })).toBeNull();
  });

  it("ignores a foreign value under the key instead of crashing (collision safety)", () => {
    // A consumer stored something unrelated under the same custom key — must be treated as "off".
    expect(getAutoTranslateConfig(wrap("enabled"))).toBeNull();
    expect(getAutoTranslateConfig(wrap({}))).toBeNull();
    expect(getAutoTranslateConfig(wrap({ foo: 1 }))).toBeNull();
  });

  it("rejects a config whose targets is not an array of strings", () => {
    expect(getAutoTranslateConfig(wrap({ targets: "de" }))).toBeNull();
    expect(getAutoTranslateConfig(wrap({ targets: [1, 2] }))).toBeNull();
    expect(getAutoTranslateConfig(wrap({ targets: ["de", 2] }))).toBeNull();
  });

  it("accepts an empty targets array (valid, just produces no work)", () => {
    expect(getAutoTranslateConfig(wrap({ targets: [] }))).toEqual({ targets: [] });
  });
});
