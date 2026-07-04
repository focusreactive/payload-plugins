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

  it("Add button opts out of color transitions while disabled so it can never freeze mid-fade looking idle", () => {
    render(<SynonymsField synonyms={[]} onAdd={vi.fn()} onRemove={vi.fn()} />);
    const addBtn = screen.getByRole("button", { name: /add synonym/iu });
    expect(addBtn.className).toContain("disabled:transition-none");
  });

  it("Add button is disabled until input has text; Enter and click both commit", () => {
    const onAdd = vi.fn();
    render(<SynonymsField synonyms={[]} onAdd={onAdd} onRemove={vi.fn()} />);
    const input = screen.getByPlaceholderText(/add a synonym/iu);
    const addBtn = screen.getByRole("button", { name: /add synonym/iu }) as HTMLButtonElement;
    expect(addBtn.disabled).toBe(true);
    fireEvent.change(input, { target: { value: "node cms" } });
    expect(addBtn.disabled).toBe(false);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onAdd).toHaveBeenCalledWith("node cms");
  });
});
