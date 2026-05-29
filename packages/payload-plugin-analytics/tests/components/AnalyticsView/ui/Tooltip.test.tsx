import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Tooltip, TooltipText } from "../../../../src/components/AnalyticsView/ui/Tooltip";

function renderTip() {
  const utils = render(
    <Tooltip content={<TooltipText>Hidden detail</TooltipText>}>
      <span>Trigger</span>
    </Tooltip>,
  );
  // the trigger root is the wrapper span that owns the hover/focus handlers
  const trigger = screen.getByText("Trigger").parentElement as HTMLElement;
  return { ...utils, trigger };
}

describe("Tooltip", () => {
  it("renders the trigger but keeps content out of the DOM until interaction", () => {
    renderTip();
    expect(screen.getByText("Trigger")).toBeInTheDocument();
    expect(screen.queryByText("Hidden detail")).not.toBeInTheDocument();
  });

  it("shows content on pointer enter and removes it on leave", () => {
    const { trigger } = renderTip();
    fireEvent.mouseEnter(trigger);
    expect(screen.getByText("Hidden detail")).toBeInTheDocument();
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByText("Hidden detail")).not.toBeInTheDocument();
  });

  it("shows content on focus and removes it on blur (keyboard access)", () => {
    const { trigger } = renderTip();
    fireEvent.focus(trigger);
    expect(screen.getByText("Hidden detail")).toBeInTheDocument();
    fireEvent.blur(trigger);
    expect(screen.queryByText("Hidden detail")).not.toBeInTheDocument();
  });

  it("renders content in a portal on document.body, escaping the trigger subtree", () => {
    const { trigger, container } = renderTip();
    fireEvent.mouseEnter(trigger);
    const tip = screen.getByText("Hidden detail");
    expect(container.contains(tip)).toBe(false);
    expect(document.body.contains(tip)).toBe(true);
    expect(tip.closest('[role="tooltip"]')).not.toBeNull();
  });
});
