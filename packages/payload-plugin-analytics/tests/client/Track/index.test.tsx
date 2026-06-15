import { fireEvent, render } from "@testing-library/react";
import { forwardRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { AnalyticsContext } from "../../../src/client/AnalyticsProvider/AnalyticsContext";
import type { AnalyticsProvider } from "../../../src/types/provider";
import { Track } from "../../../src/client/Track/index";

function makeProvider(): AnalyticsProvider {
  return {
    name: "fake",
    Scripts: () => null,
    trackEvent: vi.fn(),
    pageView: vi.fn(),
  };
}

function renderWithProvider(ui: React.ReactElement, provider: AnalyticsProvider) {
  return render(<AnalyticsContext.Provider value={{ provider }}>{ui}</AnalyticsContext.Provider>);
}

describe("<Track>", () => {
  it("renders multiple children without throwing (no tracking attached)", () => {
    const provider = makeProvider();
    // Multiple children can't receive a single cloned handler, but Track must not
    // crash the page — it renders them untouched and warns in dev.
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { getByText } = renderWithProvider(
      // @ts-expect-error - intentionally passing two children
      <Track on="click" event="x">
        <button>a</button>
        <button>b</button>
      </Track>,
      provider
    );
    expect(getByText("a")).toBeInTheDocument();
    expect(getByText("b")).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("renders nothing (no throw) when children is null", () => {
    const provider = makeProvider();
    const { container } = renderWithProvider(
      <Track on="click" event="x">
        {null}
      </Track>,
      provider
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("clones the single element when it arrives wrapped (array + null siblings)", () => {
    const provider = makeProvider();
    // Mirrors what the RSC boundary delivers: one real element alongside a null
    // (e.g. a sibling that rendered nothing). Children.only would throw here.
    const { getByRole } = renderWithProvider(
      <Track on="click" event="x">
        {[<button key="b">btn</button>, null]}
      </Track>,
      provider
    );
    const btn = getByRole("button");
    expect(btn).toHaveAttribute("data-analytics-skip", "1");
    fireEvent.click(btn);
    expect(provider.trackEvent).toHaveBeenCalledWith("x", undefined);
  });

  it("on=click merges with existing onClick (ours fires first)", () => {
    const provider = makeProvider();
    const calls: string[] = [];
    const original = () => calls.push("original");
    const { getByText } = renderWithProvider(
      <Track on="click" event="custom_click" payload={{ a: 1 }}>
        <button onClick={original}>btn</button>
      </Track>,
      provider
    );
    fireEvent.click(getByText("btn"));
    expect(provider.trackEvent).toHaveBeenCalledWith("custom_click", { a: 1 });
    expect(calls).toEqual(["original"]);
  });

  it("sets data-analytics-skip='1' on the cloned child", () => {
    const provider = makeProvider();
    const { getByRole } = renderWithProvider(
      <Track on="click" event="x">
        <button>btn</button>
      </Track>,
      provider
    );
    expect(getByRole("button")).toHaveAttribute("data-analytics-skip", "1");
  });

  it("on=submit merges with existing onSubmit", () => {
    const provider = makeProvider();
    const handler = vi.fn((e: React.FormEvent) => e.preventDefault());
    const { getByTestId } = renderWithProvider(
      <Track on="submit" event="form_x">
        <form data-testid="f" onSubmit={handler}>
          <button type="submit">go</button>
        </form>
      </Track>,
      provider
    );
    fireEvent.submit(getByTestId("f"));
    expect(provider.trackEvent).toHaveBeenCalledWith("form_x", undefined);
    expect(handler).toHaveBeenCalled();
  });

  it("on=hover fires on mouseenter", () => {
    const provider = makeProvider();
    const { getByText } = renderWithProvider(
      <Track on="hover" event="hover_x">
        <button>btn</button>
      </Track>,
      provider
    );
    fireEvent.mouseEnter(getByText("btn"));
    expect(provider.trackEvent).toHaveBeenCalledWith("hover_x", undefined);
  });

  it("forwardRef child receives the ref through cloneElement", () => {
    const provider = makeProvider();
    const Btn = forwardRef<HTMLButtonElement, { onClick?: (e: React.MouseEvent) => void }>(function Btn(props, ref) {
      return (
        <button ref={ref} {...props}>
          forwarded
        </button>
      );
    });
    const ref = { current: null as HTMLButtonElement | null };
    renderWithProvider(
      <Track on="click" event="x">
        <Btn ref={ref} />
      </Track>,
      provider
    );
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
