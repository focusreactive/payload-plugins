import { seoTextField } from "@focus-reactive/payload-plugin-seo";
import type { Field } from "payload";

import { blankAsMissing } from "@/lib/fields/blankAsMissing";

/**
 * Each field is localized on its own rather than through a localized "meta" tab. Postgres stores
 * both shapes in the same locales-table columns, but Payload's query builder only joins the
 * locales table for a localized group or a localized leaf field, never for a localized named tab,
 * so every list-view filter on "meta.title" died with `where  is null` (a missing column).
 */
export const generateSeoFields = ({
  robotsDefault = "index",
  generation = false,
}: {
  robotsDefault?: "index" | "noindex";
  generation?: boolean;
} = {}): Field[] => [
  blankAsMissing(
    seoTextField({
      name: "title",
      kind: "title",
      localized: true,
      label: { en: "Meta title", es: "Meta título" },
      showButton: generation,
      generateOnPublish: generation,
    })
  ),
  {
    admin: {
      description: {
        en: "Image used when sharing this page on social media.",
        es: "Imagen utilizada al compartir esta página en redes sociales.",
      },
    },
    label: { en: "Meta image", es: "Imagen meta" },
    localized: true,
    name: "image",
    relationTo: "media",
    type: "upload",
  },
  blankAsMissing(
    seoTextField({
      name: "description",
      kind: "description",
      localized: true,
      label: { en: "Meta description", es: "Meta descripción" },
      showButton: generation,
      generateOnPublish: generation,
    })
  ),
  {
    admin: {
      description: {
        en: "Allow search engines to index this page",
        es: "Permite a los motores de búsqueda indexar esta página",
      },
    },
    defaultValue: robotsDefault,
    label: { en: "Robots", es: "Robots" },
    localized: true,
    name: "robots",
    options: [
      { label: { en: "Index", es: "Index" }, value: "index" },
      { label: { en: "No Index", es: "No Index" }, value: "noindex" },
    ],
    type: "select",
  },
];
