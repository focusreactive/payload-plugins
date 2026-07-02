// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useKeyphrases } from "../../src/components/SeoDrawer/useKeyphrases";
import { MAX_KEYPHRASES } from "../../src/constants";

beforeEach(() => localStorage.clear());

const args = { collectionSlug: "pages", docId: "1", localeCode: "en" };

describe("useKeyphrases", () => {
  it("starts with a single empty focus when nothing stored", () => {
    const { result } = renderHook(() => useKeyphrases(args));
    expect(result.current.keyphrases).toHaveLength(1);
    expect(result.current.keyphrases[0].text).toBe("");
  });

  it("persists non-empty entries and reloads them", () => {
    const { result, unmount } = renderHook(() => useKeyphrases(args));
    act(() => result.current.updateText(result.current.keyphrases[0].id, "payload cms"));
    unmount();
    const { result: r2 } = renderHook(() => useKeyphrases(args));
    expect(r2.current.keyphrases[0].text).toBe("payload cms");
  });

  it("loads an independent set per locale", () => {
    const { result } = renderHook(() => useKeyphrases(args));
    act(() => result.current.updateText(result.current.keyphrases[0].id, "payload cms"));
    const { result: de } = renderHook(() => useKeyphrases({ ...args, localeCode: "de" }));
    expect(de.current.keyphrases[0].text).toBe("");
  });

  it("addRelated adds a new empty on every call and caps at MAX_KEYPHRASES", () => {
    const { result } = renderHook(() => useKeyphrases(args));
    act(() => result.current.updateText(result.current.keyphrases[0].id, "a"));
    act(() => result.current.addRelated()); // 2
    act(() => result.current.addRelated()); // 3: adds another empty, no single-empty block
    expect(result.current.keyphrases).toHaveLength(3);
    for (let i = 0; i < MAX_KEYPHRASES; i++) act(() => result.current.addRelated());
    expect(result.current.keyphrases).toHaveLength(MAX_KEYPHRASES);
  });

  it("addRelated returns the id of the newly added entry", () => {
    const { result } = renderHook(() => useKeyphrases(args));
    act(() => result.current.updateText(result.current.keyphrases[0].id, "a"));
    let newId: string | undefined;
    act(() => {
      newId = result.current.addRelated();
    });
    expect(newId).toBeTruthy();
    const last = result.current.keyphrases.at(-1);
    expect(last?.id).toBe(newId);
    expect(last?.text).toBe("");
  });

  it("never removes the focus entry; it stays and can only be emptied", () => {
    const { result } = renderHook(() => useKeyphrases(args));
    act(() => result.current.updateText(result.current.keyphrases[0].id, "payload cms"));
    act(() => result.current.remove(result.current.keyphrases[0].id));
    expect(result.current.keyphrases).toHaveLength(1);
    expect(result.current.keyphrases[0].text).toBe("payload cms");
  });
});
