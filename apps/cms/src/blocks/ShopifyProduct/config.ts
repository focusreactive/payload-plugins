/**
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
        components: {
          // The stored value is still the handle in this same text field - the picker replaces how
          // an editor arrives at it, not what is saved - so nothing about the schema moves.
          Field: "@/components/admin/ProductHandlePicker#ProductHandlePicker",
        },
        description:
          "The book or product this section shows. Its name, cover, price and availability all come from the store, so there is nothing to retype here.",
      },
      label: { en: "Product", es: "Producto" },
      name: "productHandle",
      required: true,
      type: "text",
    },
    {
      admin: {
        description: {
          en: "Show the price under the product's name.",
          es: "Muestra el precio debajo del nombre del producto.",
        },
      },
      defaultValue: true,
      label: { en: "Show price", es: "Mostrar precio" },
      name: "showPrice",
      type: "checkbox",
    },
    {
      admin: {
        description: {
          en: "On by default here, because a section built around one product is usually there to sell it. Turning it off leaves the card itself as the link to the product page.",
          es: "Activado por defecto aquí, porque una sección centrada en un solo producto suele existir para venderlo. Desactivarlo deja la tarjeta como enlace a la página del producto.",
        },
      },
      defaultValue: true,
      label: { en: "Show buy button", es: "Mostrar botón de compra" },
      name: "showBuyButton",
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
