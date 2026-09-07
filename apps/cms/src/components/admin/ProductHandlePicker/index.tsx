"use client";

/**
 * The editing experience for a Shopify product handle: click, see the store's products as cards,
 * filter, click one, done. It replaces only the *editor's* half of the field - the stored value
 * stays the handle in the same text field, so the eight handles already seeded in the sandbox keep
 * working and there is no schema change and no migration behind this.
 *
 * That constraint is why the field is still literally a Payload `TextInput`. The handle is always
 * visible, always typeable and always clearable, and the picker is a drawer hanging off it. An
 * editor who cannot reach the store - no token, a 502, an expired scope - loses the convenience
 * and keeps the field, which is the only acceptable failure mode for a control that sits on a
 * required field.
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
import { useCallback, useMemo, useState } from "react";

import type { StoreProductOption } from "@/lib/config/storeProducts";

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
  const { error, load, products, status } = useStoreProducts();
  const [filter, setFilter] = useState("");

  const matches = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return needle ? products.filter((product) => matchesFilter(product, needle)) : products;
  }, [filter, products]);

  // The fetch is bound to this click and nothing else. No effect, no fetch on mount: a document
  // with eight carousel rows renders eight of these fields and issues no request at all until an
  // editor opens one.
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
        onChange={(event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value)}
        path={path}
        placeholder={field.admin?.placeholder}
        readOnly={readOnly}
        required={field.required}
        showError={showError}
        value={value ?? ""}
      />

      {/* Deliberately no echo of the value here: the input above already shows the handle in full,
          so a second, truncated copy would be strictly less useful than the field it duplicates. */}
      <div className={`${baseClass}__actions`}>
        <Button
          buttonStyle="secondary"
          disabled={readOnly}
          margin={false}
          onClick={openPicker}
          size="small"
          type="button"
        >
          Browse the store
        </Button>

        {value ? (
          <Button
            buttonStyle="subtle"
            disabled={readOnly}
            margin={false}
            onClick={() => setValue("")}
            size="small"
            type="button"
          >
            Clear
          </Button>
        ) : null}
      </div>

      <Drawer slug={drawerSlug} title="Choose a product">
        <div className={`${baseClass}__filter`}>
          <TextInput
            label="Filter by title or handle"
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
              The handle field above still works — type the product’s handle by hand, or try the
              store again.
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
            <Banner type="info">
              The store answered but has no products to show. Type the handle by hand above.
            </Banner>
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
                        // Plain <img>: next/image would need the Shopify CDN added to
                        // next.config.mjs remotePatterns, which is a config change on a shared
                        // public repo for one admin thumbnail.
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
                    <span className={`${baseClass}__card-handle`}>{product.handle}</span>
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
