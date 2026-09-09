/**
 * Lists the store's products so an editor can pick one instead of typing its handle.
 *
 * The inverse of the other two Shopify reads: `getProductByHandle` and `getProductsByHandles`
 * resolve a handle somebody already knew, this one exists so nobody has to know it. It stays
 * server-side for the same reason they do - the Storefront token must not reach a browser bundle -
 * which is why the admin panel reaches it through an endpoint rather than fetching Shopify itself.
 *
 * DAL conventions from `./README.md`: one read per file, re-exported from `lib/dal/index.ts`, and
 * `getStorefrontConfig`/`storefront` imported relatively rather than through the `@/dal` barrel,
 * which would be a cycle.
 */

import type { StoreProductOption } from "@/lib/config/storeProducts";
import { STORE_PRODUCTS_LIMIT } from "@/lib/config/storeProducts";

import type { StorefrontConfig } from "./getProductByHandle";
import { getStorefrontConfig, storefront } from "./getProductByHandle";

/**
 * `sortKey: TITLE` rather than Shopify's default relevance order: a picker an editor opens twice
 * has to show the same catalogue in the same places both times, or scanning it is guesswork.
 *
 * The field selection is the card-shaped subset `getProductsByHandles` uses, minus the fields a
 * picker card cannot show (first variant id, availability, compare-at price).
 */
const STORE_PRODUCTS_QUERY = /* GraphQL */ `
  query StoreProducts($first: Int!) {
    products(first: $first, sortKey: TITLE) {
      nodes {
        handle
        title
        featuredImage {
          url
          altText
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
          }
        }
      }
    }
  }
`;

interface StoreProductsResponse {
  products: {
    nodes: {
      handle: string;
      title: string;
      featuredImage: { url: string; altText: string | null } | null;
      priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
    }[];
  };
}

/**
 * Returns null when no store is wired up, and an array - possibly empty - when one is. The caller
 * needs those two apart: "we never configured a store" and "the store has no products" are
 * different problems, and an editor shown one message for both would go looking in the wrong place.
 */
export async function getStoreProductOptions(
  options: { first?: number } = {}
): Promise<StoreProductOption[] | null> {
  const config: StorefrontConfig | null = getStorefrontConfig();
  if (!config) return null;

  const first = Math.min(Math.max(options.first ?? STORE_PRODUCTS_LIMIT, 1), STORE_PRODUCTS_LIMIT);

  const data = await storefront<StoreProductsResponse>(config, STORE_PRODUCTS_QUERY, { first });

  return data.products.nodes.map((product) => ({
    featuredImage: product.featuredImage,
    handle: product.handle,
    price: product.priceRange.minVariantPrice,
    title: product.title,
  }));
}
