import type { GroupField } from "payload";

import { blankAsMissing } from "@/lib/fields/blankAsMissing";

/**
 * SEO title and description for a document type that has no SEO tab of its own. Both are ours to
 * write even on an article synced from Passle, because Passle sends no SEO fields and never
 * overwrites these. Each field is localized on its own, not the group, for the same query reason
 * as `generateSeoFields`: a localized container stops "meta.title" from being filterable.
 */
export const seoMetaGroup = ({
  titleFallback,
  descriptionFallback,
}: {
  titleFallback: string;
  descriptionFallback: string;
}): GroupField => ({
  admin: {
    description: {
      en: `What search engines show for this page. Left empty, the ${titleFallback} and ${descriptionFallback} are used instead.`,
      es: `Lo que muestran los buscadores para esta página. Si se deja vacío, se usan el ${titleFallback} y ${descriptionFallback}.`,
    },
  },
  fields: [
    blankAsMissing({
      admin: {
        description: {
          en: "Up to 60 characters shows in full in search results.",
          es: "Hasta 60 caracteres se muestran completos en los resultados de búsqueda.",
        },
      },
      label: { en: "Meta title", es: "Meta título" },
      localized: true,
      name: "title",
      type: "text",
    }),
    blankAsMissing({
      admin: {
        description: {
          en: "Up to 160 characters shows in full in search results.",
          es: "Hasta 160 caracteres se muestran completos en los resultados de búsqueda.",
        },
      },
      label: { en: "Meta description", es: "Meta descripción" },
      localized: true,
      name: "description",
      type: "textarea",
    }),
  ],
  label: { en: "SEO", es: "SEO" },
  name: "meta",
  type: "group",
});
