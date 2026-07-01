// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeyphraseRail } from "../../src/components/SeoDrawer/tabs/keyphrase/KeyphraseRail";

const entries = [
  { id: "a", text: "payload cms", synonyms: [] },
  { id: "b", text: "", synonyms: [] },
];

afterEach(() => {
  cleanup();
});

describe("KeyphraseRail", () => {
  it("shows the count, FOCUS chip on index 0, and placeholder for empty text", () => {
    render(
      <KeyphraseRail
        entries={entries}
        selectedId="a"
        stateFor={() => ({ kind: "idle" as const })}
        onSelect={vi.fn()}
        onAdd={vi.fn()}
      />
    );
    expect(screen.getByText(/2\s*\/\s*5/)).toBeTruthy();
    expect(screen.getByText("FOCUS")).toBeTruthy();
    expect(screen.getByText(/new keyphrase/i)).toBeTruthy();
  });

  it("selects on click and disables Add when an empty entry exists", () => {
    const onSelect = vi.fn();
    render(
      <KeyphraseRail
        entries={entries}
        selectedId="a"
        stateFor={() => ({ kind: "idle" as const })}
        onSelect={onSelect}
        onAdd={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText("payload cms"));
    expect(onSelect).toHaveBeenCalledWith("a");
    expect(
      (screen.getByRole("button", { name: /add related keyphrase/i }) as HTMLButtonElement).disabled
    ).toBe(true);
  });
});
