/**
 * A rail of Shopify products. The multi-product sibling of the Shopify Product block: the editor
 * supplies an ordered list of handles and nothing else, so the store stays the source of truth for
 * its own titles, prices and images and nobody retypes a price into the CMS.
 */

import type { Block, Field } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";

const fields: Field[] = [
  ...sectionHeaderFields({
    headingDefault: { en: "Featured products", es: "Productos destacados" },
  }),
  // Deliberately not `localized: true`, unlike the Carousel and FAQ arrays: a handle identifies a
  // product in the store, not copy, so localizing it would make an editor re-enter the whole list
  // per locale and let the two lists drift apart.
  {
    admin: {
      components: {
        // The shared RowLabel reads `label` off the row by default, and this row's only field is
        // `handle`, so without titleField every collapsed row would show nothing but its number.
        RowLabel: {
          clientProps: { prefix: "Product", titleField: "handle" },
          path: "@/components/admin/RowLabel#RowLabel",
        },
      },
      description: {
        en: "One row per product, shown left to right in this order. Drag a row to move it.",
        es: "Una fila por producto, mostrados de izquierda a derecha en este orden. Arrastra una fila para moverla.",
      },
      initCollapsed: true,
    },
    fields: [
      {
        admin: {
          components: {
            // The stored value is still the handle in this same text field, so the eight handles
            // already seeded keep resolving and no migration follows from adding this.
            Field: "@/components/admin/ProductHandlePicker#ProductHandlePicker",
          },
          description: {
            en: "The product this row shows. Its name, cover, price and availability all come from the store, so there is nothing to retype here.",
            es: "El producto de esta fila. Su nombre, portada, precio y disponibilidad vienen de la tienda, así que no hay nada que volver a escribir aquí.",
          },
        },
        label: { en: "Product", es: "Producto" },
        name: "handle",
        required: true,
        type: "text",
      },
    ],
    label: { en: "Products", es: "Productos" },
    labels: {
      plural: { en: "Products", es: "Productos" },
      singular: { en: "Product", es: "Producto" },
    },
    minRows: 1,
    name: "productHandles",
    required: true,
    type: "array",
  },
  {
    admin: {
      description: {
        en: "Show the price under each product's name.",
        es: "Muestra el precio debajo del nombre de cada producto.",
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
        en: "Off by default, to match the design: the whole card links to the product page. Turning this on adds a buy button under each card that checks out the product directly.",
        es: "Desactivado por defecto, según el diseño: toda la tarjeta enlaza a la página del producto. Activarlo añade un botón de compra debajo de cada tarjeta que lleva directamente al pago del producto.",
      },
    },
    defaultValue: false,
    label: { en: "Show buy button", es: "Mostrar botón de compra" },
    name: "showBuyButton",
    type: "checkbox",
  },
];

export const ShopifyCarouselBlock: Block = injectSection({
  ...getBlockPreviewImage("Shopify Carousel"),
  fields,
  interfaceName: "ShopifyCarouselBlock",
  labels: {
    plural: { en: "Shopify Carousels", es: "Carruseles de Shopify" },
    singular: { en: "Shopify Carousel", es: "Carrusel de Shopify" },
  },
  slug: "shopifyCarousel",
});
