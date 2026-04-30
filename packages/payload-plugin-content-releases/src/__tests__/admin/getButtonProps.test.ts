import { describe, it, expect } from "vitest";
import { getPublishButtonProps } from "../../admin/components/getPublishButtonProps";
import type { ReleaseStatus } from "../../types";

describe("ReleaseActionsField — Publish Now button enablement", () => {
  const enabledStates: ReleaseStatus[] = ["draft", "scheduled", "cancelled"];
  const disabledStates: ReleaseStatus[] = [
    "publishing",
    "published",
    "failed",
    "reverting",
    "reverted",
  ];

  it.each(enabledStates)("enables button for status '%s'", (status) => {
    expect(getPublishButtonProps(status).disabled).toBe(false);
  });

  it.each(disabledStates)(
    "disables button with a tooltip for status '%s'",
    (status) => {
      const props = getPublishButtonProps(status);
      expect(props.disabled).toBe(true);
      expect(props.tooltip).toBeTruthy();
    },
  );

  it("enables button when status is undefined (initial render)", () => {
    expect(getPublishButtonProps(undefined).disabled).toBe(false);
  });
});
