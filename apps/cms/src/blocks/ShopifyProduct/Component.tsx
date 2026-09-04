/**
 * STAGED SOURCE - not yet applied. Destination on the sandbox branch:
 *   apps/cms/src/blocks/ShopifyProduct/Component.tsx
 *
 * A server component, which is the acceptance criterion for this piece: "The Shopify card is in
 * the server-rendered HTML, not injected by client-side JavaScript." Verify it with
 *   curl -s <url> | grep -i "<product title>"
 * and not by looking at the rendered page in a browser, which cannot tell the two apart.
 *
 * The Buy button is a form posting to a server action, so the only client-side work is the
 * navigation to Shopify's hosted checkout. Nothing about the card itself needs JavaScript.
 */

import { createCheckoutUrl, getProductByHandle, getStorefrontConfig } from "@/dal";

interface Props {
  heading?: string | null;
  description?: string | null;
  productHandle?: string | null;
  showPrice?: boolean | null;
}

async function checkout(formData: FormData) {
  "use server";

  const { redirect } = await import("next/navigation");
  const variantId = formData.get("variantId");
  if (typeof variantId !== "string") return;

  const url = await createCheckoutUrl(variantId);
  if (url) redirect(url);
}

export async function ShopifyProductBlockComponent({
  description,
  heading,
  productHandle,
  showPrice,
}: Props) {
  // An unconfigured store must never look like a broken page during a walkthrough, so say plainly
  // what is missing instead of rendering an empty section.
  if (!getStorefrontConfig()) {
    return (
      <section
        style={{ border: "1px dashed #b8b8b8", borderRadius: 8, margin: "32px 0", padding: 24 }}
      >
        <h2 style={{ fontSize: 20, margin: 0 }}>{heading ?? "From the bookstore"}</h2>
        <p style={{ color: "#666", fontSize: 14 }}>
          Shopify is not wired up on this deployment. Set SHOPIFY_STORE_DOMAIN and
          SHOPIFY_STOREFRONT_TOKEN to render a live product here.
        </p>
      </section>
    );
  }

  let product = null;
  let error: string | null = null;
  try {
    product = await getProductByHandle(productHandle ?? "");
  } catch (cause) {
    // A block that throws takes the whole page down with it. On a demo the page must survive one
    // bad handle, and the message has to name the handle or nobody can fix it on the call.
    error = cause instanceof Error ? cause.message : String(cause);
  }

  if (error || !product) {
    return (
      <section
        style={{ border: "1px dashed #b8b8b8", borderRadius: 8, margin: "32px 0", padding: 24 }}
      >
        <h2 style={{ fontSize: 20, margin: 0 }}>{heading ?? "From the bookstore"}</h2>
        <p style={{ color: "#666", fontSize: 14 }}>
          {error ? `Shopify error: ${error}` : `No product found for handle "${productHandle}".`}
        </p>
      </section>
    );
  }

  return (
    <section style={{ margin: "32px 0" }}>
      <h2 style={{ fontSize: 20, marginBottom: 4 }}>{heading ?? "From the bookstore"}</h2>
      {description ? (
        <p style={{ color: "#666", fontSize: 14, marginTop: 0 }}>{description}</p>
      ) : null}

      <article
        style={{
          border: "1px solid #e0e0e0",
          borderRadius: 8,
          display: "flex",
          gap: 20,
          maxWidth: 640,
          padding: 20,
        }}
      >
        {product.featuredImage ? (
          // Plain <img>: next/image would need the Shopify CDN added to next.config.ts
          // remotePatterns, which is a config change on a shared public repo for one demo card.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt={product.featuredImage.altText ?? product.title}
            src={product.featuredImage.url}
            style={{ height: "auto", objectFit: "cover", width: 140 }}
            width={140}
          />
        ) : null}

        <div>
          <h3 style={{ fontSize: 17, margin: "0 0 6px" }}>{product.title}</h3>
          {showPrice !== false && product.price ? (
            <p style={{ fontWeight: 600, margin: "0 0 8px" }}>
              {new Intl.NumberFormat("en-US", {
                currency: product.price.currencyCode,
                style: "currency",
              }).format(Number(product.price.amount))}
            </p>
          ) : null}
          <p style={{ color: "#444", fontSize: 14, margin: "0 0 12px" }}>
            {product.description.slice(0, 220)}
          </p>

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
                  padding: "8px 16px",
                }}
                type="submit"
              >
                Buy on Shopify
              </button>
            </form>
          ) : (
            <p style={{ color: "#888", fontSize: 13 }}>Currently unavailable</p>
          )}
        </div>
      </article>
    </section>
  );
}
