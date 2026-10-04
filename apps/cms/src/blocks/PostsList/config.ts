import type { Block } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";
import { sectionHeaderFields } from "@/lib/fields/sectionHeader/sectionHeaderFields";
import { link } from "@/lib/fields/link";

export const PostsListBlock: Block = injectSection({
  slug: "postsList",
  interfaceName: "PostsListBlock",
  ...getBlockPreviewImage("Posts List"),
  labels: {
    plural: { en: "Posts Lists", es: "Listas de publicaciones" },
    singular: { en: "Posts List", es: "Lista de publicaciones" },
  },
  fields: [
    ...sectionHeaderFields(),
    {
      type: "row",
      fields: [
        {
          admin: { width: "34%" },
          defaultValue: "latest",
          label: { en: "Source", es: "Origen" },
          name: "source",
          options: [
            { label: { en: "Latest posts", es: "Últimas publicaciones" }, value: "latest" },
            { label: { en: "By category", es: "Por categoría" }, value: "category" },
            { label: { en: "By author", es: "Por autor" }, value: "author" },
          ],
          required: true,
          type: "select",
        },
        {
          admin: {
            condition: (_, siblingData) => siblingData?.source === "category",
            width: "33%",
          },
          label: { en: "Category", es: "Categoría" },
          name: "category",
          relationTo: "categories",
          type: "relationship",
        },
        {
          admin: {
            condition: (_, siblingData) => siblingData?.source === "author",
            width: "33%",
          },
          label: { en: "Author", es: "Autor" },
          name: "author",
          relationTo: "authors",
          type: "relationship",
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          admin: { width: "34%" },
          defaultValue: 3,
          label: { en: "Number of posts", es: "Número de publicaciones" },
          max: 12,
          min: 1,
          name: "limit",
          required: true,
          type: "number",
        },
        {
          admin: { width: "66%" },
          defaultValue: "grid",
          label: { en: "Layout", es: "Diseño" },
          name: "layout",
          options: [
            { label: { en: "Grid (cards)", es: "Cuadrícula" }, value: "grid" },
            { label: { en: "List (dense rows)", es: "Lista" }, value: "list" },
            { label: { en: "Featured + two", es: "Destacado + dos" }, value: "featured" },
          ],
          required: true,
          type: "select",
        },
      ],
    },
    link({
      appearances: false,
      required: false,
      overrides: {
        admin: {
          description: {
            en: "Optional “View all” link under the list",
            es: "Enlace opcional “Ver todo” bajo la lista",
          },
        },
        label: { en: "View all link", es: "Enlace “Ver todo”" },
        name: "viewAll",
      },
    }),
  ],
});
