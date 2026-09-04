/**
 * STAGED SOURCE - not yet applied. Destination on the sandbox branch:
 *   apps/cms/src/lib/dal/getProductByHandle.ts
 *
 * demo-plan.md §9 is right that the fetch belongs in `src/lib/dal/`. Two conventions that
 * directory enforces (see its README): application code imports from the `@/dal` barrel rather
 * than from a file inside it, so this must be re-exported from `lib/dal/index.ts`; and the alias
 * is `@/dal` -> `src/lib/dal`, which is why the import below is not `@/lib/dal`.
 *
 * One server-side Storefront API call, modelled on vercel/commerce's lib/shopify.
 *
 * Why not @shopify/buy-button-js: it injects the card client-side, so a crawler sees an empty div.
 * On a deal whose entire premise is being invisible to search and AI engines, a product card that
 * only exists after JavaScript runs would argue against our own recommendation. This runs on the
 * server and the card is in the HTML.
 */

const API_VERSION = "2026-07";

export interface ShopifyProduct {
  handle: string;
  title: string;
  description: string;
  featuredImage: { url: string; altText: string | null } | null;
  price: { amount: string; currencyCode: string } | null;
  variantId: string | null;
  availableForSale: boolean;
}

const PRODUCT_QUERY = /* GraphQL */ `
  query ProductByHandle($handle: String!) {
    product(handle: $handle) {
      handle
      title
      description
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
      variants(first: 1) {
        nodes {
          id
        }
      }
    }
  }
`;

const CART_CREATE_MUTATION = /* GraphQL */ `
  mutation CartCreate($lines: [CartLineInput!]!) {
    cartCreate(input: { lines: $lines }) {
      cart {
        checkoutUrl
      }
      userErrors {
        message
      }
    }
  }
`;

interface StorefrontConfig {
  domain: string;
  token: string;
}

/** Returns null rather than throwing when the demo has no store wired up yet. */
export function getStorefrontConfig(): StorefrontConfig | null {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
  return domain && token ? { domain, token } : null;
}

/**
 * Public and private Storefront tokens are sent under DIFFERENT headers, and using the wrong one
 * fails as an auth error rather than as anything that names the real problem:
 *
 *   public  (32 hex chars, safe in a browser, rate-limited per IP)  X-Shopify-Storefront-Access-Token
 *   private (`shpat_`-prefixed, server-only, not IP-limited)        Shopify-Storefront-Private-Token
 *
 * Every call here is server-side, so a private token is the better choice - but the prefix decides
 * the header, so either can be pasted into SHOPIFY_STOREFRONT_TOKEN and it works.
 *
 * An Admin API token also starts with `shpat_` and will NOT work against the Storefront API. If a
 * `shpat_` token returns 401 here, that is the likely reason.
 */
function authHeader(token: string): Record<string, string> {
  return token.startsWith("shpat_")
    ? { "Shopify-Storefront-Private-Token": token }
    : { "X-Shopify-Storefront-Access-Token": token };
}

async function storefront<T>(
  config: StorefrontConfig,
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`https://${config.domain}/api/${API_VERSION}/graphql.json`, {
    body: JSON.stringify({ query, variables }),
    headers: {
      "Content-Type": "application/json",
      ...authHeader(config.token),
    },
    method: "POST",
    // The demo is a preview deployment, so ISR is what keeps a walkthrough from hitting Shopify on
    // every render while still letting a price change appear without a redeploy.
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Shopify Storefront API ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as { data?: T; errors?: { message: string }[] };
  // A GraphQL error arrives with HTTP 200, so checking response.ok alone would let a null product
  // through as if the handle simply did not exist.
  if (payload.errors?.length) {
    throw new Error(`Shopify Storefront API: ${payload.errors.map((e) => e.message).join("; ")}`);
  }
  if (!payload.data) throw new Error("Shopify Storefront API returned no data");
  return payload.data;
}

export async function getProductByHandle(handle: string): Promise<ShopifyProduct | null> {
  const config = getStorefrontConfig();
  if (!config || !handle) return null;

  type Response = {
    product: null | {
      handle: string;
      title: string;
      description: string;
      availableForSale: boolean;
      featuredImage: { url: string; altText: string | null } | null;
      priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
      variants: { nodes: { id: string }[] };
    };
  };

  const { product } = await storefront<Response>(config, PRODUCT_QUERY, { handle });
  if (!product) return null;

  return {
    availableForSale: product.availableForSale,
    description: product.description,
    featuredImage: product.featuredImage,
    handle: product.handle,
    price: product.priceRange.minVariantPrice,
    title: product.title,
    variantId: product.variants.nodes[0]?.id ?? null,
  };
}

/**
 * Creates a cart and returns Shopify's hosted checkout URL. This is the whole of commerce in this
 * demo - render a product, hand off to checkout - and deliberately nothing past it (§2).
 */
export async function createCheckoutUrl(variantId: string): Promise<string | null> {
  const config = getStorefrontConfig();
  if (!config) return null;

  type Response = {
    cartCreate: { cart: { checkoutUrl: string } | null; userErrors: { message: string }[] };
  };

  const { cartCreate } = await storefront<Response>(config, CART_CREATE_MUTATION, {
    lines: [{ merchandiseId: variantId, quantity: 1 }],
  });

  if (cartCreate.userErrors.length) {
    throw new Error(`cartCreate: ${cartCreate.userErrors.map((e) => e.message).join("; ")}`);
  }
  return cartCreate.cart?.checkoutUrl ?? null;
}
