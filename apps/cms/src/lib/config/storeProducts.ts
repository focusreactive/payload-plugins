/**
 * Shared by the admin product picker's client component and the endpoint that feeds it.
 *
 * They cannot share the DAL module instead: that one closes over the Storefront transport and the
 * token it reads from the environment, so importing it from a `"use client"` file would put both
 * on the wrong side of the network boundary. A constants module has nothing to leak.
 */

export const STORE_PRODUCTS_ENDPOINT_PATH = "/store/products";

/**
 * The Storefront API caps `products(first:)` at 250. 100 is comfortably inside that and is already
 * more than a picker can show usefully, which is why the filter input narrows the page that was
 * fetched rather than issuing a fresh query per keystroke.
 */
export const STORE_PRODUCTS_LIMIT = 100;

/**
 * Deliberately smaller than `ShopifyProductCard`: a picker card shows a cover, a title and a
 * handle, so variant ids and availability would be fetched and shipped to the browser for nothing.
 */
export interface StoreProductOption {
  handle: string;
  title: string;
  featuredImage: { url: string; altText: string | null } | null;
  price: { amount: string; currencyCode: string } | null;
}
