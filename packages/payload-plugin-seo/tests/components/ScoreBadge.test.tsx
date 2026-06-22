// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ScoreBadge } from "../../src/components/SeoButton/ScoreBadge";

afterEach(cleanup);

describe("ScoreBadge", () => {
  it("renders the numeric score", () => {
    render(<ScoreBadge score={72} status="good" />);
    expect(screen.getByText("72")).toBeInTheDocument();
  });

  it("renders a perfect and a zero score verbatim", () => {
    const { rerender } = render(<ScoreBadge score={100} status="good" />);
    expect(screen.getByText("100")).toBeInTheDocument();
    rerender(<ScoreBadge score={0} status="bad" />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("applies the solid status color per status", () => {
    const { rerender } = render(<ScoreBadge score={80} status="good" />);
    expect(screen.getByText("80")).toHaveClass("bg-seo-good");
    rerender(<ScoreBadge score={55} status="warn" />);
    expect(screen.getByText("55")).toHaveClass("bg-seo-warn");
    rerender(<ScoreBadge score={20} status="bad" />);
    expect(screen.getByText("20")).toHaveClass("bg-seo-bad");
  });

  it("uses UnreadBadge sizing/position and white text", () => {
    render(<ScoreBadge score={42} status="good" />);
    const el = screen.getByText("42");
    expect(el).toHaveClass(
      "absolute",
      "-top-1",
      "-right-1",
      "min-w-[14px]",
      "h-[14px]",
      "rounded-full",
      "text-white"
    );
  });

  it("exposes the score via an accessible label", () => {
    render(<ScoreBadge score={63} status="warn" />);
    expect(screen.getByLabelText("SEO score 63")).toBeInTheDocument();
  });

  it("merges an extra className", () => {
    render(<ScoreBadge className="extra-cls" score={10} status="bad" />);
    expect(screen.getByText("10")).toHaveClass("extra-cls");
  });
});
