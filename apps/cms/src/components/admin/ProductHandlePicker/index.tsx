"use client";

/**
 * The editing experience for a Shopify product reference: click, see the store's products as cards,
 * filter, click one, done. The stored value is still the product's handle in the same text field,
 * so the handles already seeded keep working and there is no schema change behind this.
 *
 * The handle input is READ-ONLY, and that is the whole design. A handle is a machine address an
 * editor has no way to verify by eye: a typo saves clean, passes validation, and surfaces later as
 * a section that renders nothing, on a page nobody thought to re-check. Removing the keyboard from
 * the field removes that failure. What replaces it is the product's real title and a link straight
 * to it in Shopify, so the editor confirms the choice against the thing itself rather than against
 * a string.
 *
 * There is no Clear button for the same reason. Both fields using this picker are `required`, so an
 * empty value is not a state an editor can usefully reach - clearing only produces an invalid block
 * they must then fix. The two valid moves are pick and replace, so those are the two on offer.
 *
 * When the store cannot be reached the saved handle still renders and the block still works; only
 * the title and the link are missing. The cost of a 502 is confirmation, never the value.
 */

import {
  Banner,
  Button,
  Drawer,
  ShimmerEffect,
  TextInput,
  useDrawerSlug,
  useField,
  useModal,
} from "@payloadcms/ui";
import type { TextFieldClientComponent } from "payload";
import type { ChangeEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { StoreProductOption } from "@/lib/config/storeProducts";
import { storeProductUrl } from "@/lib/config/storeProducts";

import { useStoreProducts } from "./useStoreProducts";

import "./index.scss";

const baseClass = "product-handle-picker";

/**
 * Shopify returns money as a decimal string plus a currency code, and a non-numeric amount is
 * possible enough (an unpriced product, a currency the browser does not know) that a thrown
 * Intl error must not take the whole grid down with it.
 */
function formatPrice(price: StoreProductOption["price"]): string | null {
  if (!price) return null;

  const amount = Number(price.amount);
  if (!Number.isFinite(amount)) return null;

  try {
    return new Intl.NumberFormat(undefined, {
      currency: price.currencyCode,
      style: "currency",
    }).format(amount);
  } catch {
    return `${price.amount} ${price.currencyCode}`;
  }
}

function matchesFilter(product: StoreProductOption, needle: string): boolean {
  return (
    product.title.toLowerCase().includes(needle) || product.handle.toLowerCase().includes(needle)
  );
}

export const ProductHandlePicker: TextFieldClientComponent = ({ field, path, readOnly }) => {
  const { customComponents, setValue, showError, value } = useField<string>({ path });
  const drawerSlug = useDrawerSlug(baseClass);
  const { closeModal, openModal } = useModal();
  const { error, load, products, status, storeDomain } = useStoreProducts();
  const [filter, setFilter] = useState("");

  // Resolving the saved handle into a title needs the catalogue, so a document that already has
  // products asks for it once on mount. `useStoreProducts` shares one promise at module scope, so
  // a carousel with eight rows still issues exactly one request - and a document with no product
  // saved yet still issues none.
  useEffect(() => {
    if (value) void load();
  }, [load, value]);

  const matches = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return needle ? products.filter((product) => matchesFilter(product, needle)) : products;
  }, [filter, products]);

  const selected = useMemo(
    () => (value ? (products.find((product) => product.handle === value) ?? null) : null),
    [products, value]
  );

  const selectedUrl = selected ? storeProductUrl(selected, storeDomain) : null;

  const openPicker = useCallback(async () => {
    openModal(drawerSlug);
    await load();
  }, [drawerSlug, load, openModal]);

  const choose = useCallback(
    (handle: string) => {
      setValue(handle);
      closeModal(drawerSlug);
    },
    [closeModal, drawerSlug, setValue]
  );

  return (
    <div className={baseClass}>
      <TextInput
        Description={customComponents?.Description}
        description={field.admin?.description}
        Error={customComponents?.Error}
        label={field.label}
        Label={customComponents?.Label}
        path={path}
        // Always read-only, whatever the document's own lock state. See the note at the top.
        readOnly
        required={field.required}
        showError={showError}
        value={value ?? ""}
      />

      {value ? (
        <div className={`${baseClass}__selected`}>
          {status === "loading" ? (
            <ShimmerEffect height="calc(var(--base) * 2.5)" />
          ) : selected ? (
            <>
              <span className={`${baseClass}__selected-thumb`}>
                {selected.featuredImage ? (
                  // Plain <img>: next/image would need the Shopify CDN added to next.config.mjs
                  // remotePatterns, which is a config change on a shared public repo for one
                  // admin thumbnail.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={selected.featuredImage.altText ?? selected.title}
                    src={selected.featuredImage.url}
                  />
                ) : null}
              </span>
              <span className={`${baseClass}__selected-text`}>
                <strong>{selected.title}</strong>
                {formatPrice(selected.price) ? <span>{formatPrice(selected.price)}</span> : null}
              </span>
              {selectedUrl ? (
                <a
                  className={`${baseClass}__selected-link`}
                  href={selectedUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open in the store ↗
                </a>
              ) : null}
            </>
          ) : status === "ready" ? (
            // The catalogue answered and does not contain this handle. Nearly always a product
            // that was renamed or unpublished in Shopify after the block was built, which is the
            // one failure a read-only field cannot prevent - so it has to be said out loud rather
            // than left as a section that renders nothing.
            <Banner type="error">
              No product in the store has this address any more. Choose it again.
            </Banner>
          ) : status === "error" ? (
            <p className={`${baseClass}__selected-muted`}>
              The store could not be reached, so the product’s name is not shown. The saved product
              is unaffected.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className={`${baseClass}__actions`}>
        <Button
          buttonStyle="secondary"
          disabled={readOnly}
          margin={false}
          onClick={openPicker}
          size="small"
          type="button"
        >
          {value ? "Change product" : "Choose a product"}
        </Button>
      </div>

      <Drawer slug={drawerSlug} title="Choose a product">
        <div className={`${baseClass}__filter`}>
          <TextInput
            label="Filter by name"
            onChange={(event: ChangeEvent<HTMLInputElement>) => setFilter(event.target.value)}
            path={`${path}__store-filter`}
            placeholder="Start typing…"
            value={filter}
          />
        </div>

        {status === "loading" ? (
          <ul className={`${baseClass}__grid`}>
            {[0, 1, 2, 3, 4, 5].map((placeholder) => (
              <li key={placeholder}>
                <ShimmerEffect height="calc(var(--base) * 8)" />
              </li>
            ))}
          </ul>
        ) : null}

        {status === "error" ? (
          <div className={`${baseClass}__status`}>
            <Banner type="error">{error}</Banner>
            <p>
              Nothing has been lost — the product saved on this block is still there. Try the store
              again.
            </p>
            <Button
              buttonStyle="secondary"
              onClick={async () => {
                await load({ force: true });
              }}
              size="small"
              type="button"
            >
              Try again
            </Button>
          </div>
        ) : null}

        {status === "ready" && products.length === 0 ? (
          <div className={`${baseClass}__status`}>
            <Banner type="info">The store answered but has no products to show.</Banner>
          </div>
        ) : null}

        {status === "ready" && products.length > 0 && matches.length === 0 ? (
          <p className={`${baseClass}__status`}>No product matches “{filter}”.</p>
        ) : null}

        {matches.length > 0 ? (
          <ul className={`${baseClass}__grid`}>
            {matches.map((product) => {
              const price = formatPrice(product.price);

              return (
                <li key={product.handle}>
                  <button
                    className={[
                      `${baseClass}__card`,
                      product.handle === value ? `${baseClass}__card--current` : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => choose(product.handle)}
                    type="button"
                  >
                    <span className={`${baseClass}__thumb`}>
                      {product.featuredImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          alt={product.featuredImage.altText ?? product.title}
                          src={product.featuredImage.url}
                        />
                      ) : (
                        <span className={`${baseClass}__thumb-empty`}>No image</span>
                      )}
                    </span>

                    <span className={`${baseClass}__card-title`}>{product.title}</span>
                    {price ? <span className={`${baseClass}__card-price`}>{price}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </Drawer>
    </div>
  );
};
