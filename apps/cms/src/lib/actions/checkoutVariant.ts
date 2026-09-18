"use server";

import { buildCartPermalink, createCheckoutUrl } from "@/dal";

/**
 * Shared by the store carousel (the whole card submits this) and the single-product block's own
 * Buy button. One action rather than two copies: `redirect()` navigates by throwing, so a caller
 * that forgot the fallback-on-failure branch would silently strand the shopper on the same page.
 *
 * `cartCreate` throws when Shopify reports userErrors and returns null on a success carrying no
 * cart. Neither may surface as a Next error overlay or as a button that visibly does nothing on a
 * live walkthrough, so both fall back to the cart permalink - the one destination that needs no
 * API call and therefore cannot fail here.
 */
export async function checkoutVariant(formData: FormData) {
  const { redirect } = await import("next/navigation");
  const variantId = formData.get("variantId");
  if (typeof variantId !== "string") return;

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

  const destination = hostedCheckoutUrl ?? buildCartPermalink(variantId);
  if (destination) redirect(destination);
}
