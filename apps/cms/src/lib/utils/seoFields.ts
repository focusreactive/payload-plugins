import { seoTextField } from "@focus-reactive/payload-plugin-seo";
import type { Field } from "payload";

export const generateSeoFields = ({
  robotsDefault = "index",
  generation = false,
}: { robotsDefault?: "index" | "noindex"; generation?: boolean } = {}): Field[] => [
  seoTextField({
    name: "title",
    kind: "title",
    label: { en: "Title in search results", es: "Título en buscadores" },
    showButton: generation,
    generateOnPublish: generation,
  }),
  {
    label: { en: "Social sharing image", es: "Imagen para redes sociales" },
    name: "image",
    relationTo: "media",
    type: "upload",
  },
  seoTextField({
    name: "description",
    kind: "description",
    label: { en: "Description in search results", es: "Descripción en buscadores" },
    showButton: generation,
    generateOnPublish: generation,
  }),
  {
    defaultValue: robotsDefault,
    label: { en: "Search engines", es: "Buscadores" },
    name: "robots",
    options: [
      {
        label: { en: "Show in search results", es: "Mostrar en los resultados de búsqueda" },
        value: "index",
      },
      {
        label: { en: "Hide from search results", es: "Ocultar de los resultados de búsqueda" },
        value: "noindex",
      },
    ],
    type: "select",
  },
];
