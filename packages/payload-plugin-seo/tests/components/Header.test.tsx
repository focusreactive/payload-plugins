// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Header } from "../../src/components/SeoDrawer/components/Header";

const closeModal = vi.fn();

vi.mock("@payloadcms/ui", () => ({
  useModal: () => ({ closeModal }),
  XIcon: () => <svg data-testid="x-icon" />,
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Header", () => {
  it("renders the total score in the pill", () => {
    render(<Header drawerSlug="seo-drawer" total={72} totalStatus="good" />);

    expect(screen.getByText("72")).toBeInTheDocument();
  });

  it("closes its own drawer when the close button is clicked", () => {
    render(<Header drawerSlug="seo-drawer" total={72} totalStatus="good" />);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    expect(closeModal).toHaveBeenCalledWith("seo-drawer");
  });
});
