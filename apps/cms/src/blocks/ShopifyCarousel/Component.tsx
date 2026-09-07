/**
 * A server component, which is the whole point of the section: the products have to be in the
 * server-rendered HTML, not injected once JavaScript runs. Verify it the only way that can tell
 * the two apart -
 *   curl -s <url> | grep -i "<a product title>"
 * - and never by looking at the rendered page in a browser.
 *
 * That constraint is also why the rail is CSS-only (overflow-x plus scroll-snap) instead of a
 * carousel library: a slider would hydrate, and a hydrated slider is one refactor away from
 * fetching its own slides.
 */

import { getProductsByHandles, getStorefrontConfig } from "@/dal";

interface ProductHandleRow {
  handle?: string | null;
  id?: string | null;
}

interface Props {
  eyebrow?: string | null;
  heading?: string | null;
  description?: string | null;
  productHandles?: (ProductHandleRow | null)[] | null;
  showPrice?: boolean | null;
}

const FALLBACK_HEADING = "Featured products";

const noticeStyle = {
  border: "1px dashed #b8b8b8",
  borderRadius: 8,
  margin: "32px 0",
  padding: 24,
} as const;

function formatMoney(money: { amount: string; currencyCode: string }): string {
  return new Intl.NumberFormat("en-US", {
    currency: money.currencyCode,
    style: "currency",
  }).format(Number(money.amount));
}

/**
 * Shopify's cart permalink - a plain URL that adds the variant and lands on hosted checkout. The
 * single-product block posts to a server action instead, which is a better fit there; in a rail it
 * would mean one form and one round-trip per card for the same destination, and a link keeps the
 * section entirely static.
 *
 * The variant id arrives as `gid://shopify/ProductVariant/<numeric>`, and the permalink wants the
 * numeric tail only.
 */
function buildCartPermalink(storeDomain: string, variantId: string): string | null {
  const numericVariantId = variantId.split("/").pop();
  if (!numericVariantId || !/^\d+$/u.test(numericVariantId)) return null;
  return `https://${storeDomain}/cart/${numericVariantId}:1`;
}

export async function ShopifyCarouselBlockComponent({
  description,
  eyebrow,
  heading,
  productHandles,
  showPrice,
}: Props) {
  const storefrontConfig = getStorefrontConfig();

  // An unconfigured store must never look like a broken page during a walkthrough, so say plainly
  // what is missing instead of rendering an empty section.
  if (!storefrontConfig) {
    return (
      <section style={noticeStyle}>
        <h2 style={{ fontSize: 20, margin: 0 }}>{heading ?? FALLBACK_HEADING}</h2>
        <p style={{ color: "#666", fontSize: 14 }}>
          Shopify is not wired up on this deployment. Set SHOPIFY_STORE_DOMAIN and
          SHOPIFY_STOREFRONT_TOKEN to render live products here.
        </p>
      </section>
    );
  }

  const requestedHandles = (productHandles ?? [])
    .map((handleRow) => handleRow?.handle?.trim() ?? "")
    .filter((productHandle) => productHandle.length > 0);

  if (requestedHandles.length === 0) {
    return (
      <section style={noticeStyle}>
        <h2 style={{ fontSize: 20, margin: 0 }}>{heading ?? FALLBACK_HEADING}</h2>
        <p style={{ color: "#666", fontSize: 14 }}>
          No product handles are configured for this section yet.
        </p>
      </section>
    );
  }

  // getProductsByHandles swallows a per-handle failure by design, so there is nothing to catch
  // here: the only failure this component can still see is an empty result.
  const products = await getProductsByHandles(requestedHandles);

  if (products.length === 0) {
    return (
      <section style={noticeStyle}>
        <h2 style={{ fontSize: 20, margin: 0 }}>{heading ?? FALLBACK_HEADING}</h2>
        <p style={{ color: "#666", fontSize: 14 }}>
          No products found in Shopify for{" "}
          {requestedHandles.map((productHandle) => `"${productHandle}"`).join(", ")}.
        </p>
      </section>
    );
  }

  return (
    <section style={{ margin: "32px 0" }}>
      {eyebrow ? (
        <p
          style={{
            color: "#888",
            fontSize: 13,
            letterSpacing: "0.06em",
            margin: "0 0 4px",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2 style={{ fontSize: 20, marginBottom: 4 }}>{heading ?? FALLBACK_HEADING}</h2>
      {description ? (
        <p style={{ color: "#666", fontSize: 14, marginTop: 0 }}>{description}</p>
      ) : null}

      {/*
        tabIndex makes the rail reachable by keyboard, because a scroll container that only
        responds to a trackpad is unusable without one - and there is no script here to move it.
      */}
      <ul
        aria-label={heading ?? FALLBACK_HEADING}
        style={{
          display: "flex",
          gap: 16,
          listStyle: "none",
          margin: 0,
          overflowX: "auto",
          padding: "4px 0 12px",
          scrollSnapType: "x mandatory",
        }}
        tabIndex={0}
      >
        {products.map((product) => {
          const cartPermalink =
            product.variantId && product.availableForSale
              ? buildCartPermalink(storefrontConfig.domain, product.variantId)
              : null;

          return (
            <li
              key={product.handle}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                display: "flex",
                // Fixed basis with no shrink: the cards have to overflow the section for the rail
                // to scroll at all, so they must not compress to fit.
                flex: "0 0 220px",
                flexDirection: "column",
                gap: 8,
                padding: 16,
                scrollSnapAlign: "start",
              }}
            >
              {product.featuredImage ? (
                // Plain <img>: next/image would need the Shopify CDN added to next.config.ts
                // remotePatterns, which is a config change on a shared public repo for one card.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={product.featuredImage.altText ?? product.title}
                  src={product.featuredImage.url}
                  style={{ borderRadius: 4, height: 200, objectFit: "cover", width: "100%" }}
                  width={188}
                />
              ) : null}

              <h3 style={{ fontSize: 16, margin: 0 }}>{product.title}</h3>

              {showPrice !== false && product.price ? (
                <p style={{ margin: 0 }}>
                  <span style={{ fontWeight: 600 }}>{formatMoney(product.price)}</span>
                  {product.compareAtPrice ? (
                    <span style={{ color: "#888", marginLeft: 8, textDecoration: "line-through" }}>
                      {formatMoney(product.compareAtPrice)}
                    </span>
                  ) : null}
                </p>
              ) : null}

              <div style={{ marginTop: "auto" }}>
                {cartPermalink ? (
                  <a
                    href={cartPermalink}
                    style={{
                      background: "#111",
                      borderRadius: 4,
                      color: "#fff",
                      display: "inline-block",
                      fontSize: 14,
                      padding: "8px 16px",
                      textDecoration: "none",
                    }}
                  >
                    Buy on Shopify
                  </a>
                ) : (
                  <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Currently unavailable</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
