// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SynonymsField } from "../../src/components/SeoDrawer/tabs/keyphrase/SynonymsField";

afterEach(() => {
  cleanup();
});

describe("SynonymsField", () => {
  it("renders chips and removes on ✕", () => {
    const onRemove = vi.fn();
    render(
      <SynonymsField synonyms={["ts cms", "typed cms"]} onAdd={vi.fn()} onRemove={onRemove} />
    );
    expect(screen.getByText("ts cms")).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: /remove synonym/iu })[0]);
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it("shows no Add button until the input has text", () => {
    render(<SynonymsField synonyms={[]} onAdd={vi.fn()} onRemove={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /add synonym/iu })).toBeNull();
  });

  it("commits a typed synonym with Enter or the Add button", () => {
    const onAdd = vi.fn();
    render(<SynonymsField synonyms={[]} onAdd={onAdd} onRemove={vi.fn()} />);
    const input = screen.getByPlaceholderText(/add a synonym/iu);
    fireEvent.change(input, { target: { value: "node cms" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAdd).toHaveBeenCalledWith("node cms");

    fireEvent.change(input, { target: { value: "typed cms" } });
    fireEvent.click(screen.getByRole("button", { name: /add synonym/iu }));
    expect(onAdd).toHaveBeenCalledWith("typed cms");
  });
});
