/**
 * Multi-product sibling of `getProductByHandle`, for a section that renders a rail of cards.
 *
 * The DAL conventions this file follows are in `./README.md`: one read per file, and application
 * code imports from the `@/dal` barrel rather than from this path, so this must be re-exported
 * from `lib/dal/index.ts`. A sibling module inside the DAL may import it relatively, which is why
 * `getStorefrontConfig` below comes from `./getProductByHandle` and not from `@/dal` (that would
 * be a cycle through the barrel).
 *
 * Everything here runs on the server. The point of the section is that the products are in the
 * delivered HTML for crawlers and answer engines, which rules out the Shopify buy-button script
 * and any client-side fetch.
 */

import type { StorefrontConfig } from "./getProductByHandle";
import { getStorefrontConfig, storefront } from "./getProductByHandle";

export interface ShopifyProductCard {
  handle: string;
  title: string;
  featuredImage: { url: string; altText: string | null } | null;
  price: { amount: string; currencyCode: string } | null;
  compareAtPrice: { amount: string; currencyCode: string } | null;
  variantId: string | null;
  availableForSale: boolean;
}

/**
 * Asks for the first variant's id only, like `getProductByHandle` does: this section links to
 * checkout rather than offering variant choice, so the default variant is the whole story.
 *
 * `compareAtPriceRange.minVariantPrice` pairs with `priceRange.minVariantPrice` - comparing a
 * min against a max would show a discount on a product that has none.
 */
const PRODUCT_CARD_QUERY = /* GraphQL */ `
  query ProductCardByHandle($handle: String!) {
    product(handle: $handle) {
      handle
      title
      availableForSale
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
      compareAtPriceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      variants(first: 1) {
        nodes {
          id
        }
      }
    }
  }
`;

interface ProductCardResponse {
  product: null | {
    handle: string;
    title: string;
    availableForSale: boolean;
    featuredImage: { url: string; altText: string | null } | null;
    priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
    compareAtPriceRange: { minVariantPrice: { amount: string; currencyCode: string } };
    variants: { nodes: { id: string }[] };
  };
}

/**
 * Shopify does not omit `compareAtPriceRange` for a product that was never discounted - it
 * returns an amount of "0.0". Passing that straight through would render a struck-out $0.00 next
 * to every full-price product.
 */
function normalizeCompareAtPrice(
  compareAtPrice: { amount: string; currencyCode: string },
  price: { amount: string; currencyCode: string }
): { amount: string; currencyCode: string } | null {
  const compareAtAmount = Number(compareAtPrice.amount);
  if (!Number.isFinite(compareAtAmount) || compareAtAmount <= Number(price.amount)) return null;
  return compareAtPrice;
}

async function fetchProductCard(
  config: StorefrontConfig,
  productHandle: string
): Promise<ShopifyProductCard | null> {
  const data = await storefront<ProductCardResponse>(config, PRODUCT_CARD_QUERY, {
    handle: productHandle,
  });

  const product = data.product;
  if (!product) return null;

  return {
    availableForSale: product.availableForSale,
    compareAtPrice: normalizeCompareAtPrice(
      product.compareAtPriceRange.minVariantPrice,
      product.priceRange.minVariantPrice
    ),
    featuredImage: product.featuredImage,
    handle: product.handle,
    price: product.priceRange.minVariantPrice,
    title: product.title,
    variantId: product.variants.nodes[0]?.id ?? null,
  };
}

/**
 * Resolves the given handles to product cards, preserving the editor's order - the order of the
 * rows in the CMS is the order of the rail, so it cannot be left to whichever request returns
 * first.
 *
 * A handle that does not resolve drops out of the result instead of rejecting: one mistyped
 * handle in the CMS must cost the reader one card, not the whole section.
 */
export async function getProductsByHandles(
  productHandles: string[]
): Promise<ShopifyProductCard[]> {
  const config = getStorefrontConfig();
  if (!config) return [];

  const requestedHandles = productHandles
    .map((productHandle) => productHandle.trim())
    .filter((productHandle) => productHandle.length > 0);
  if (requestedHandles.length === 0) return [];

  // Every promise handles its own failure, so Promise.all can never reject here and `results`
  // stays index-aligned with `requestedHandles`.
  const results = await Promise.all(
    requestedHandles.map(async (productHandle) => {
      try {
        return await fetchProductCard(config, productHandle);
      } catch (cause) {
        // The card silently disappears from the rail, so the server log is the only place a
        // mistyped handle or an expired token is visible at all.
        console.warn(`[getProductsByHandles] "${productHandle}" failed:`, cause);
        return null;
      }
    })
  );

  return results.filter((product): product is ShopifyProductCard => product !== null);
}
