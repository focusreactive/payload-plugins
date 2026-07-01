// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useKeyphrases } from "../../src/components/SeoDrawer/useKeyphrases";

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

  it("addRelated respects the cap and single-empty rule", () => {
    const { result } = renderHook(() => useKeyphrases(args));
    act(() => result.current.updateText(result.current.keyphrases[0].id, "a"));
    act(() => result.current.addRelated());
    act(() => result.current.addRelated()); // second call: empty already exists → no-op
    expect(result.current.keyphrases).toHaveLength(2);
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

  it("recreates a single empty focus entry when the last keyphrase is removed", () => {
    const { result } = renderHook(() => useKeyphrases(args));
    act(() => result.current.updateText(result.current.keyphrases[0].id, "payload cms"));
    act(() => result.current.remove(result.current.keyphrases[0].id));
    expect(result.current.keyphrases).toHaveLength(1);
    expect(result.current.keyphrases[0].text).toBe("");
  });
});
