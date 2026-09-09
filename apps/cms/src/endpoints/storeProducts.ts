/**
 * Feeds the admin product picker (`components/admin/ProductHandlePicker`). The Storefront token is
 * server-only, so the picker cannot query Shopify itself - it asks this route, which is the whole
 * reason the route exists. Modelled on the SEO plugin's generate endpoint: same `req.user` guard,
 * same `Response.json` helper, same "one status code per distinguishable failure" shape.
 *
 * The DAL README puts custom endpoints on the `req.payload` side of its rule, because a read that
 * touches Payload has to join the surrounding transaction. This read touches no Payload data at
 * all - it is an HTTP call to Shopify - so there is no transaction to join and the DAL is the
 * right place for it, next to the two Shopify reads the blocks already use.
 */

import type { Endpoint, PayloadRequest } from "payload";

import { getStoreProductOptions } from "@/dal";
import { STORE_PRODUCTS_ENDPOINT_PATH } from "@/lib/config/storeProducts";

function json(data: unknown, status: number): Response {
  return Response.json(data, {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

export function createStoreProductsEndpoint(): Endpoint {
  return {
    handler: async (req: PayloadRequest): Promise<Response> => {
      // A product catalogue is not a secret - it is on the storefront. The guard is here because
      // this route exists only to fill an admin field, and an open one would hand anyone our
      // Storefront rate limit.
      if (!req.user) return json({ error: "Unauthorized" }, 401);

      try {
        const products = await getStoreProductOptions();

        // Null means no store is wired up, which is a deployment fact the editor can do nothing
        // about; an empty array means the store answered and has nothing to offer. The picker
        // shows a different message for each, so they must not collapse into one response.
        if (products === null) return json({ error: "No store is configured." }, 503);

        return json({ products }, 200);
      } catch (cause) {
        // The message can carry a Shopify error body, so it goes to the server log and the client
        // gets a generic one. The picker always leaves the handle field typeable, so a 502 here
        // costs the editor convenience rather than the ability to finish the block.
        req.payload.logger.error(`[storeProducts] ${(cause as Error).message}`);

        return json({ error: "The product list could not be loaded." }, 502);
      }
    },
    method: "get",
    path: STORE_PRODUCTS_ENDPOINT_PATH,
  };
}
