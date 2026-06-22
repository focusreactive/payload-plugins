import { getGa4Client } from "./index";
import type { ScopedGa4Client } from "../../types/layout";

export function createScopedGa4Client(propertyId: string): ScopedGa4Client {
  const client = getGa4Client();
  const propertyPath = `properties/${propertyId}`;

  return {
    async runReport(request: object) {
      const [response] = await client.runReport({
        property: propertyPath,
        ...(request as Record<string, unknown>),
      });
      return response;
    },
    async batchRunReports(request: object) {
      const [response] = await client.batchRunReports({
        property: propertyPath,
        ...(request as Record<string, unknown>),
      });
      return response;
    },
  };
}
