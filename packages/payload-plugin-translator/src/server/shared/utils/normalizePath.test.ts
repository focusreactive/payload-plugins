import { describe, it, expect } from "vitest";

import { normalizePath } from "./normalizePath";

describe("normalizePath", () => {
  it("adds leading slash to path without one", () => {
    expect(normalizePath("translate")).toBe("/translate");
  });

  it("keeps single leading slash", () => {
    expect(normalizePath("/translate")).toBe("/translate");
  });

  it("removes trailing slash", () => {
    expect(normalizePath("/translate/")).toBe("/translate");
  });

  it("removes multiple leading and trailing slashes", () => {
    expect(normalizePath("//translate//")).toBe("/translate");
  });

  it("returns empty string for empty input", () => {
    expect(normalizePath("")).toBe("");
  });

  it("returns empty string for whitespace input", () => {
    expect(normalizePath("  ")).toBe("");
  });

  it("returns empty string for only slashes", () => {
    expect(normalizePath("/")).toBe("");
    expect(normalizePath("//")).toBe("");
  });

  it("handles nested paths", () => {
    expect(normalizePath("/api/translate")).toBe("/api/translate");
    expect(normalizePath("api/translate/")).toBe("/api/translate");
  });

  it("trims whitespace", () => {
    expect(normalizePath("  /translate  ")).toBe("/translate");
  });
});
