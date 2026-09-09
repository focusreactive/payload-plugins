import type { ComponentProps, ReactNode } from "react";
import { SectionContainer } from "@/components/shared";
/**
 * A server component, which is the whole point of the section: the products have to be in the
 * server-rendered HTML, not injected once JavaScript runs. Verify it the only way that can tell
 * the two apart -
 *   curl -s <url> | grep -i "<a product title>"
 * - and never by looking at the rendered page in a browser.
 *
 * That constraint is also why the rail stays CSS - overflow-x plus scroll-snap - instead of a
 * carousel library: a library owns its slides, and slides it owns are one refactor away from being
 * fetched client-side. The only hydrated thing here is the pair of arrows in ShopifyCarouselRail,
 * which page an already-rendered scroll container and render nothing until they have measured it.
 * The cards are passed into it as children, so they are still emitted by this file.
 */

import {
  buildCartPermalink,
  createCheckoutUrl,
  getProductsByHandles,
  getStorefrontConfig,
} from "@/dal";
import { Button, ButtonVariant } from "@/components/button";
import { DisplayHeading } from "@/components/DisplayHeading";
import { SectionHeader } from "@/components/SectionHeader";
import { ShopifyCarouselRail } from "@/components/ShopifyCarouselRail";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";

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

/**
 * How wide one card is, as a fraction of the rail. Whole cards only, at every breakpoint: a card
 * sliced by the container edge is what made the previous fixed-220px rail look broken, and because
 * these fractions leave no remainder the rail's maximum scroll offset also lands exactly on a card
 * boundary - so `snap-start` has a reachable snap point at both ends of the rail.
 *
 * The subtracted amounts are the `gap-6` (1.5rem) between cards: n cards across a full-width rail
 * leave n-1 gaps. The underscores are Tailwind's escape for the spaces CSS `calc()` requires around
 * a minus sign - without them the declaration is invalid and every card falls back to its content
 * width.
 */
const CARD_WIDTH = "w-full sm:w-[calc((100%_-_1.5rem)/2)] lg:w-[calc((100%_-_3rem)/3)]";

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

interface NoticeProps {
  children: ReactNode;
  heading: string;
}

/**
 * An unconfigured or empty section must never look like a broken page during a walkthrough, so it
 * says plainly what is missing instead of rendering an empty rail. The dashed border marks it as a
 * message to whoever is building the page rather than as content - the one panel in this block that
 * is deliberately not a card.
 */
function CarouselNotice({ children, heading }: NoticeProps) {
  return (
    <div className="flex max-w-[720px] flex-col gap-6">
      <DisplayHeading as="h2" size="display-2" text={heading} />
      <p className="text-body-lg rounded-lg border border-border-strong border-dashed p-6 text-muted-foreground">
        {children}
      </p>
    </div>
  );
}

async function ShopifyCarouselBlockContent({
  description,
  eyebrow,
  heading,
  productHandles,
  showPrice,
}: Props) {
  const resolvedHeading = heading ?? FALLBACK_HEADING;
  const storefrontConfig = getStorefrontConfig();

  if (!storefrontConfig) {
    return (
      <CarouselNotice heading={resolvedHeading}>
        Shopify is not wired up on this deployment. Set SHOPIFY_STORE_DOMAIN and
        SHOPIFY_STOREFRONT_TOKEN to render live products here.
      </CarouselNotice>
    );
  }

  const requestedHandles = (productHandles ?? [])
    .map((handleRow) => handleRow?.handle?.trim() ?? "")
    .filter((productHandle) => productHandle.length > 0);

  if (requestedHandles.length === 0) {
    return (
      <CarouselNotice heading={resolvedHeading}>
        No product handles are configured for this section yet.
      </CarouselNotice>
    );
  }

  // getProductsByHandles swallows a per-handle failure by design, so there is nothing to catch
  // here: the only failure this component can still see is an empty result.
  const products = await getProductsByHandles(requestedHandles);

  if (products.length === 0) {
    return (
      <CarouselNotice heading={resolvedHeading}>
        No products found in Shopify for{" "}
        {requestedHandles.map((productHandle) => `"${productHandle}"`).join(", ")}.
      </CarouselNotice>
    );
  }

  const header = prepareSectionHeaderProps({ description, eyebrow, heading: resolvedHeading });

  return (
    <>
      {header ? <SectionHeader {...header} className="mb-12" /> : null}

      <ShopifyCarouselRail label={resolvedHeading}>
        {products.map((product) => (
          <li
            className={`flex shrink-0 snap-start flex-col gap-5 rounded-lg border border-border bg-card p-6 text-card-foreground ${CARD_WIDTH}`}
            key={product.handle}
          >
            {product.featuredImage ? (
              // Plain <img>: next/image would need the Shopify CDN added to next.config.ts
              // remotePatterns, which is a config change on a shared public repo for one card.
              // object-contain rather than cover: a crop cuts the part of the product that
              // identifies it, and the muted panel behind absorbs whatever band is left over.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={product.featuredImage.altText ?? product.title}
                className="aspect-[4/3] w-full rounded-md bg-surface-muted object-contain p-4"
                height={300}
                src={product.featuredImage.url}
                width={400}
              />
            ) : (
              // Keeps a card with no cover the same height as its neighbours, so a card boundary
              // stays where the rail's snap positions expect it.
              <div aria-hidden className="aspect-[4/3] w-full rounded-md bg-surface-muted" />
            )}

            <h3 className="text-h-card line-clamp-2 text-balance" title={product.title}>
              {product.title}
            </h3>

            {showPrice !== false && product.price ? (
              <p className="text-body-lg flex flex-wrap items-baseline gap-2">
                <span className="font-semibold">{formatMoney(product.price)}</span>
                {product.compareAtPrice ? (
                  <span className="text-small text-muted-foreground line-through">
                    {formatMoney(product.compareAtPrice)}
                  </span>
                ) : null}
              </p>
            ) : null}

            <div className="mt-auto pt-1">
              {product.variantId && product.availableForSale ? (
                <form action={checkout}>
                  <input name="variantId" type="hidden" value={product.variantId} />
                  <Button className="w-full" type="submit" variant={ButtonVariant.Primary}>
                    Buy on Shopify
                  </Button>
                </form>
              ) : (
                <p className="text-small text-muted-foreground">Currently unavailable</p>
              )}
            </div>
          </li>
        ))}
      </ShopifyCarouselRail>
    </>
  );
}

export async function ShopifyCarouselBlockComponent(props: Props) {
  return (
    <SectionContainer sectionData={{ ...props.section, id: props.id }}>
      {await ShopifyCarouselBlockContent(props)}
    </SectionContainer>
  );
}
