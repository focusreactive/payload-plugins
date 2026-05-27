import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Phone, Zap } from "lucide-react";
import {
  LeadActionRegistryProvider,
  createLeadActionRegistry,
  useLeadActionRegistry,
} from "../../../../src/components/AnalyticsView/contexts/LeadActionRegistryContext";

function Probe({ type }: { type: string }) {
  const { resolveLabel, resolveIcon } = useLeadActionRegistry();
  const Icon = resolveIcon(type);
  return (
    <span>
      <span data-testid="label">{resolveLabel(type)}</span>
      <span data-testid="icon-name">{Icon.displayName ?? Icon.name}</span>
    </span>
  );
}

describe("LeadActionRegistryContext", () => {
  it("returns built-in defaults when no user registry is provided", () => {
    render(
      <LeadActionRegistryProvider registry={{}}>
        <Probe type="phone_click" />
      </LeadActionRegistryProvider>,
    );
    expect(screen.getByTestId("label").textContent).toBe("Phone click");
  });

  it("user registry overrides built-in", () => {
    render(
      <LeadActionRegistryProvider registry={{ phone_click: { icon: Zap, label: "Call us" } }}>
        <Probe type="phone_click" />
      </LeadActionRegistryProvider>,
    );
    expect(screen.getByTestId("label").textContent).toBe("Call us");
  });

  it("humanizes unknown type when missing from both built-ins and user registry", () => {
    render(
      <LeadActionRegistryProvider registry={{}}>
        <Probe type="cta_pricing_click" />
      </LeadActionRegistryProvider>,
    );
    expect(screen.getByTestId("label").textContent).toBe("Cta pricing click");
  });

  it("createLeadActionRegistry returns a Provider component with bound registry", () => {
    const Provider = createLeadActionRegistry({ cta_pricing_click: { icon: Phone, label: "Pricing CTA" } });
    render(
      <Provider>
        <Probe type="cta_pricing_click" />
      </Provider>,
    );
    expect(screen.getByTestId("label").textContent).toBe("Pricing CTA");
  });
});
