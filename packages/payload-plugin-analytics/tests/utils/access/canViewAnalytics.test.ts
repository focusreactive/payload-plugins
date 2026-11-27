import type { PayloadRequest } from "payload";
import { afterEach, describe, expect, it } from "vitest";
import { setPluginConfig } from "../../../src/config";
import { canViewAnalytics } from "../../../src/utils/access/canViewAnalytics";
import type { AnalyticsPluginConfig } from "../../../src/types/config";

const ga4 = {
  propertyId: "1",
  measurementId: "G-X",
  serviceAccount: { clientEmail: "x", privateKey: "y" },
};

const signedIn = { user: { id: "u1", role: "editor" } } as unknown as PayloadRequest;

afterEach(() => {
  globalThis.__payloadPluginAnalyticsConfig = undefined;
});

describe("canViewAnalytics", () => {
  it("is false while the plugin is not configured", async () => {
    await expect(canViewAnalytics(signedIn)).resolves.toBe(false);
  });

  it("follows the default access rule (any signed-in user)", async () => {
    setPluginConfig({ ga4 } as AnalyticsPluginConfig);
    await expect(canViewAnalytics(signedIn)).resolves.toBe(true);
    await expect(canViewAnalytics({ user: null } as unknown as PayloadRequest)).resolves.toBe(
      false
    );
  });

  it("applies the plugin's access option", async () => {
    setPluginConfig({
      access: ({ req }) => (req.user as { role?: string } | null)?.role !== "editor",
      ga4,
    } as AnalyticsPluginConfig);
    await expect(canViewAnalytics(signedIn)).resolves.toBe(false);
  });
});
