import type { ComponentProps } from "react";
import { SectionContainer } from "@/components/shared";
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

import {
  buildCartPermalink,
  createCheckoutUrl,
  getProductsByHandles,
  getStorefrontConfig,
} from "@/dal";

interface ProductHandleRow {
  handle?: string | null;
  id?: string | null;
}

interface Props {
  /** Added by injectSection. Ignoring it is what made this block render flush to the
   *  viewport edge while every stock block sat inside the page's measure. */
  section?: ComponentProps<typeof SectionContainer>["sectionData"];
  id?: string | null;
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
  padding: 24,
} as const;

function formatMoney(money: { amount: string; currencyCode: string }): string {
  return new Intl.NumberFormat("en-US", {
    currency: money.currencyCode,
    style: "currency",
  }).format(Number(money.amount));
}

/**
 * One action for the whole rail, not one closure per card: the variant id travels in a hidden
 * input, so nothing has to be bound per render. A bound closure would work - Next encrypts bound
 * arguments - but it pays an encrypt on every render and a decrypt on every submit, per card.
 *
 * Kept at module scope for the same reason the single-product block does it (ShopifyProduct/
 * Component.tsx), and because a nested action trips `unicorn/consistent-function-scoping`.
 */
async function checkout(formData: FormData) {
  "use server";

  const { redirect } = await import("next/navigation");
  const variantId = formData.get("variantId");
  if (typeof variantId !== "string") return;

  // cartCreate throws when Shopify reports userErrors and returns null on a success carrying no
  // cart. On a live walkthrough neither may surface as a Next error overlay or as a button that
  // visibly does nothing, so both fall back to the cart permalink - the one destination that needs
  // no API call and therefore cannot fail here.
  let hostedCheckoutUrl: string | null = null;
  let failure: unknown = null;
  try {
    hostedCheckoutUrl = await createCheckoutUrl(variantId);
  } catch (cause) {
    failure = cause;
  }

  if (!hostedCheckoutUrl) {
    // The button quietly changes destination, so the server log is the only place an expired token
    // or a Shopify-side rejection is visible at all - and afterwards the only record it happened.
    console.error(
      `[checkout] ${variantId}: no hosted checkout URL, falling back to the cart permalink.`,
      failure ?? "cartCreate returned no cart"
    );
  }

  // redirect() navigates by throwing a NEXT_REDIRECT error, which is why it sits outside the try:
  // a catch that did not rethrow would swallow the navigation and the click would do nothing.
  const destination = hostedCheckoutUrl ?? buildCartPermalink(variantId);
  if (destination) redirect(destination);
}

async function ShopifyCarouselBlockContent({
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
    <section>
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
        {products.map((product) => (
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
                style={{ borderRadius: 4, height: 150, objectFit: "cover", width: "100%" }}
                width={188}
              />
            ) : null}

            <h3
              style={{
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                display: "-webkit-box",
                fontSize: 15,
                lineHeight: 1.3,
                margin: 0,
                overflow: "hidden",
              }}
              title={product.title}
            >
              {product.title}
            </h3>

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
              {product.variantId && product.availableForSale ? (
                <form action={checkout}>
                  <input name="variantId" type="hidden" value={product.variantId} />
                  <button
                    style={{
                      background: "#111",
                      border: 0,
                      borderRadius: 4,
                      color: "#fff",
                      cursor: "pointer",
                      fontSize: 14,
                      padding: "8px 16px",
                    }}
                    type="submit"
                  >
                    Buy on Shopify
                  </button>
                </form>
              ) : (
                <p style={{ color: "#888", fontSize: 13, margin: 0 }}>Currently unavailable</p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export async function ShopifyCarouselBlockComponent(props: Props) {
  return (
    <SectionContainer sectionData={{ ...props.section, id: props.id }}>
      {await ShopifyCarouselBlockContent(props)}
    </SectionContainer>
  );
}
