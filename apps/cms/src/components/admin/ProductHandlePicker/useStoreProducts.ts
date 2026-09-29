"use client";

import { useConfig } from "@payloadcms/ui";
import { useCallback, useState } from "react";

import type { StoreProductOption, StoreProductsPayload } from "@/lib/config/storeProducts";
import { STORE_PRODUCTS_ENDPOINT_PATH } from "@/lib/config/storeProducts";

export type StoreProductsStatus = "error" | "idle" | "loading" | "ready";

interface StoreProductsState {
  error: string | null;
  products: StoreProductOption[];
  status: StoreProductsStatus;
  storeDomain: string;
}

/**
 * One request per admin page, held at module scope rather than in React state.
 *
 * A Shopify Carousel with eight rows mounts eight copies of the picker field, and each of them
 * asking for the same catalogue would be eight identical Storefront round trips for one document.
 * Sharing the promise makes the second through eighth free. React state cannot do this job: each
 * field instance has its own, so they would never see each other's fetch.
 *
 * Nothing here runs during render - `load` is called from the click that opens a picker - so a
 * document with eight rows costs zero requests until an editor actually browses.
 */
let sharedRequest: Promise<StoreProductsPayload> | null = null;

async function requestStoreProducts(apiRoute: string): Promise<StoreProductsPayload> {
  const response = await fetch(`${apiRoute}${STORE_PRODUCTS_ENDPOINT_PATH}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });

  // An error body is JSON by contract, but a proxy or an auth redirect can answer with something
  // else, and a parse failure must not surface as "the store is misconfigured".
  let body: (Partial<StoreProductsPayload> & { error?: string }) | null = null;
  try {
    body = (await response.json()) as Partial<StoreProductsPayload> & { error?: string };
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.error ?? `The product list could not be loaded (${response.status}).`);
  }

  return { products: body?.products ?? [], storeDomain: body?.storeDomain ?? "" };
}

async function loadSharedStoreProducts(apiRoute: string): Promise<StoreProductsPayload> {
  sharedRequest ??= requestStoreProducts(apiRoute);

  try {
    return await sharedRequest;
  } catch (cause) {
    // A rejection is dropped rather than remembered. A cached failure would become the answer
    // every later picker on the page gets, so a token fixed mid-session could only be picked up
    // by a full reload.
    sharedRequest = null;
    throw cause;
  }
}

export function useStoreProducts() {
  const { config } = useConfig();
  const apiRoute = config.routes.api;

  const [state, setState] = useState<StoreProductsState>({
    error: null,
    products: [],
    status: "idle",
    storeDomain: "",
  });

  const load = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (options.force) sharedRequest = null;

      // Keeping already-loaded products on screen is what makes reopening the picker instant: the
      // shared promise has settled, so there is no network call and nothing to shimmer over.
      setState((current) =>
        current.products.length > 0 && !options.force
          ? current
          : { error: null, products: [], status: "loading", storeDomain: "" }
      );

      try {
        const { products, storeDomain } = await loadSharedStoreProducts(apiRoute);
        setState({ error: null, products, status: "ready", storeDomain });
      } catch (cause) {
        setState({
          error: (cause as Error).message || "The product list could not be loaded.",
          products: [],
          status: "error",
          storeDomain: "",
        });
      }
    },
    [apiRoute]
  );

  return {
    error: state.error,
    load,
    products: state.products,
    status: state.status,
    storeDomain: state.storeDomain,
  };
}
