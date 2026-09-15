import type { ComponentProps, ReactNode } from "react";
import { SectionContainer } from "@/components/shared";
/**
 * A server component, which is the acceptance criterion for this piece: "The Shopify card is in
 * the server-rendered HTML, not injected by client-side JavaScript." Verify it with
 *   curl -s <url> | grep -i "<product title>"
 * and not by looking at the rendered page in a browser, which cannot tell the two apart.
 *
 * The Buy button is a form posting to a server action, so the only client-side work is the
 * navigation to Shopify. Nothing about the card itself needs JavaScript.
 */

import {
  buildCartPermalink,
  createCheckoutUrl,
  getProductByHandle,
  getStorefrontConfig,
} from "@/dal";
import { Button } from "@/components/ui/Button";
import { DisplayHeading } from "@/components/DisplayHeading";
import type { PreparedMedia } from "@/components/media";
import { SectionHeader } from "@/components/SectionHeader";
import { ContentCard } from "@/components/ui/ContentCard";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";

interface Props {
  /** Added by injectSection. Ignoring it is what made this block render flush to the
   *  viewport edge while every stock block sat inside the page's measure. */
  section?: ComponentProps<typeof SectionContainer>["sectionData"];
  id?: string | null;
  heading?: string | null;
  description?: string | null;
  productHandle?: string | null;
  showBuyButton?: boolean | null;
  showPrice?: boolean | null;
}

const FALLBACK_HEADING = "From the bookstore";

/**
 * ContentCard's own width formula (clamp(260px, calc((100% - 2 * clamp(16px,1.6vw,24px)) / 3.28),
 * 460px)) sizes the card itself, but a lone card and its buy button need the same width to read as
 * one unit - matching that width here is what keeps the button from stretching full-section-wide.
 */
const PRODUCT_CARD_WIDTH =
  "clamp(260px, calc((100% - 2 * clamp(16px, 1.6vw, 24px)) / 3.28), 460px)";

function formatMoney(money: { amount: string; currencyCode: string }): string {
  return new Intl.NumberFormat("en-US", {
    currency: money.currencyCode,
    style: "currency",
  }).format(Number(money.amount));
}

/**
 * Product images come from Shopify's CDN, which is allowed in `next.config.mjs`'s
 * `images.remotePatterns` so these go through the real image pipeline rather than shipping the
 * original asset. Adding a new storefront host means adding it there too.
 */
function buildProductCover(
  featuredImage: { url: string; altText: string | null } | null,
  title: string
): PreparedMedia | undefined {
  if (!featuredImage) return undefined;
  return {
    data: { alt: featuredImage.altText ?? title, kind: "image", src: featuredImage.url },
  };
}

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

interface NoticeProps {
  children: ReactNode;
  heading: string;
}

/**
 * Mirrors ShopifyCarousel's CarouselNotice (the two blocks are not allowed to share a file - see
 * this block's task notes): an unconfigured store or a bad handle must read as a message to
 * whoever is building the page, not as a blank or crashed section.
 */
function ProductNotice({ children, heading }: NoticeProps) {
  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      <DisplayHeading as="h2" size="display-2" text={heading} />
      <p className="text-body-lg rounded-lg border border-border-strong border-dashed p-6 text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

async function ShopifyProductBlockContent({
  description,
  heading,
  productHandle,
  showBuyButton,
  showPrice,
}: Props) {
  const resolvedHeading = heading ?? FALLBACK_HEADING;
  const storefrontConfig = getStorefrontConfig();

  // An unconfigured store must never look like a broken page during a walkthrough, so say plainly
  // what is missing instead of rendering an empty section.
  if (!storefrontConfig) {
    return (
      <ProductNotice heading={resolvedHeading}>
        Shopify is not wired up on this deployment. Set SHOPIFY_STORE_DOMAIN and
        SHOPIFY_STOREFRONT_TOKEN to render a live product here.
      </ProductNotice>
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
      <ProductNotice heading={resolvedHeading}>
        {error ? `Shopify error: ${error}` : `No product found for handle "${productHandle}".`}
      </ProductNotice>
    );
  }

  const header = prepareSectionHeaderProps({ description, heading: resolvedHeading });
  const canBuy = Boolean(product.variantId) && product.availableForSale;

  return (
    <>
      {header ? <SectionHeader {...header} className="mb-12" /> : null}

      <div className="flex flex-col gap-4" style={{ width: PRODUCT_CARD_WIDTH }}>
        <ContentCard
          cover={buildProductCover(product.featuredImage, product.title)}
          description={product.description}
          href={`https://${storefrontConfig.domain}/products/${product.handle}`}
          price={showPrice !== false && product.price ? formatMoney(product.price) : undefined}
          title={product.title}
        />

        {/* The toggle governs the whole purchase affordance, so turning it off also drops the
            out-of-stock note - with no way to buy, stock is not something a reader can act on. */}
        {showBuyButton !== false &&
          (canBuy ? (
            <form action={checkout}>
              <input name="variantId" type="hidden" value={product.variantId ?? ""} />
              <Button className="w-full" tone="primary" type="submit">
                Buy on Shopify
              </Button>
            </form>
          ) : (
            <p className="text-small text-muted-foreground">Currently unavailable</p>
          ))}
      </div>
    </>
  );
}

export async function ShopifyProductBlockComponent(props: Props) {
  return (
    <SectionContainer sectionData={{ ...props.section, id: props.id }}>
      {await ShopifyProductBlockContent(props)}
    </SectionContainer>
  );
}
