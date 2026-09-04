/**
 * STAGED SOURCE - not yet applied. Destination on the sandbox branch:
 *   apps/cms/src/blocks/ShopifyProduct/config.ts
 *
 * A CMS section whose only real field is a Shopify product handle (demo-plan.md §9). Everything
 * else about the product - title, price, image, availability - is fetched server-side at render
 * time, so the bookstore stays the source of truth for its own catalogue and an editor never
 * retypes a price into the CMS.
 */

import type { Block } from "payload";

import { injectSection } from "@/lib/fields/section/injectSection";
import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";

export const ShopifyProductBlock: Block = injectSection({
  ...getBlockPreviewImage("Shopify Product"),
  fields: [
    ...sectionHeaderFields({
      headingDefault: { en: "From the bookstore", es: "De la librería" },
    }),
    {
      admin: {
        description:
          "The product's handle in Shopify - the last path segment of its storefront URL, e.g. my-first-product. Not the numeric id.",
        placeholder: "my-first-product",
      },
      label: { en: "Product handle", es: "Identificador del producto" },
      name: "productHandle",
      required: true,
      type: "text",
    },
    {
      defaultValue: true,
      label: { en: "Show price", es: "Mostrar precio" },
      name: "showPrice",
      type: "checkbox",
    },
  ],
  interfaceName: "ShopifyProductBlock",
  labels: {
    plural: { en: "Shopify Products", es: "Productos de Shopify" },
    singular: { en: "Shopify Product", es: "Producto de Shopify" },
  },
  slug: "shopifyProduct",
});
