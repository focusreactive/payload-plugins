// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { KeyphraseDetail } from "../../src/components/SeoDrawer/tabs/keyphrase/KeyphraseDetail";

afterEach(() => {
  cleanup();
});

const base = {
  entry: { id: "a", text: "payload cms", synonyms: [] },
  duplicate: false,
  analysis: { kind: "hint" as const, message: "…" },
  onTextChange: vi.fn(),
  onAddSynonym: vi.fn(),
  onRemoveSynonym: vi.fn(),
  onSetFocus: vi.fn(),
  onRemove: vi.fn(),
};

describe("KeyphraseDetail", () => {
  it("focus keyphrase shows neither Set as focus nor Remove", () => {
    render(<KeyphraseDetail {...base} isFocus />);
    expect(screen.queryByRole("button", { name: /set as focus/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /remove/i })).toBeNull();
    expect(screen.getByLabelText(/focus keyphrase/i)).toBeTruthy();
  });

  it("related keyphrase shows both Set as focus and Remove", () => {
    render(<KeyphraseDetail {...base} isFocus={false} />);
    expect(screen.getByRole("button", { name: /set as focus/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /remove/i })).toBeTruthy();
    expect(screen.getByLabelText(/related keyphrase/i)).toBeTruthy();
  });

  it("shows a duplicate warning and typing calls onTextChange", () => {
    render(<KeyphraseDetail {...base} isFocus duplicate />);
    expect(screen.getByText(/already in your keyphrase list/i)).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/focus keyphrase/i), { target: { value: "x" } });
    expect(base.onTextChange).toHaveBeenCalledWith("x");
  });

  it("renders the analyzing loader", () => {
    render(<KeyphraseDetail {...base} isFocus analysis={{ kind: "analyzing" }} />);
    expect(screen.getByText(/analyzing keyphrase/i)).toBeTruthy();
  });
});
