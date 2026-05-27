import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { Phone, Zap } from "lucide-react";
import { useGetLeadActionIcon } from "../../../../src/components/AnalyticsView/icons/getLeadActionIcon";
import { LeadActionRegistryProvider } from "../../../../src/components/AnalyticsView/contexts/LeadActionRegistryContext";

function ProbeIcon({ type, onResolve }: { type: string; onResolve: (Icon: unknown) => void }) {
  const get = useGetLeadActionIcon();
  onResolve(get(type));
  return null;
}

describe("useGetLeadActionIcon", () => {
  it("returns the built-in icon for a known type", () => {
    let resolved: unknown;
    render(
      <LeadActionRegistryProvider registry={{}}>
        <ProbeIcon type="phone_click" onResolve={(i) => (resolved = i)} />
      </LeadActionRegistryProvider>,
    );
    expect(resolved).toBe(Phone);
  });

  it("returns the fallback Zap icon for an unknown type", () => {
    let resolved: unknown;
    render(
      <LeadActionRegistryProvider registry={{}}>
        <ProbeIcon type="cta_unknown" onResolve={(i) => (resolved = i)} />
      </LeadActionRegistryProvider>,
    );
    expect(resolved).toBe(Zap);
  });
});
