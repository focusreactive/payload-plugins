import { describe, expect, it, beforeEach } from "vitest";
import {
  setPageContext,
  getPageContext,
  clearPageContext,
} from "../../../src/client/pageContext/store";

describe("pageContext store", () => {
  beforeEach(() => clearPageContext());

  it("returns null context before any set", () => {
    expect(getPageContext()).toBeNull();
  });

  it("stores and returns the current page ref + locale", () => {
    setPageContext({ pageRef: "page:42", locale: "en" });
    expect(getPageContext()).toEqual({ pageRef: "page:42", locale: "en" });
  });

  it("overwrites on navigation", () => {
    setPageContext({ pageRef: "page:42", locale: "en" });
    setPageContext({ pageRef: "posts:7", locale: "es" });
    expect(getPageContext()).toEqual({ pageRef: "posts:7", locale: "es" });
  });

  it("clear resets to null", () => {
    setPageContext({ pageRef: "page:42", locale: "en" });
    clearPageContext();
    expect(getPageContext()).toBeNull();
  });
});
