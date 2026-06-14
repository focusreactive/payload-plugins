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

  it("hides the score pill in the idle (pre-analysis) state", () => {
    render(<Header drawerSlug="seo-drawer" total={0} totalStatus="idle" />);

    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("still shows the pill for a real zero score", () => {
    render(<Header drawerSlug="seo-drawer" total={0} totalStatus="bad" />);

    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders the close button regardless of status, including idle", () => {
    render(<Header drawerSlug="seo-drawer" total={0} totalStatus="idle" />);

    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});
