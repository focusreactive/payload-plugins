import { seoTextField } from "@focus-reactive/payload-plugin-seo";
import type { Field } from "payload";

export const generateSeoFields = ({
  robotsDefault = "index",
  generation = false,
}: { robotsDefault?: "index" | "noindex"; generation?: boolean } = {}): Field[] => [
  seoTextField({
    name: "title",
    kind: "title",
    label: { en: "Meta title", es: "Meta título" },
    showButton: generation,
    generateOnPublish: generation,
  }),
  {
    admin: {
      description: {
        en: "Image used when sharing this page on social media.",
        es: "Imagen utilizada al compartir esta página en redes sociales.",
      },
    },
    label: { en: "Meta image", es: "Imagen meta" },
    name: "image",
    relationTo: "media",
    type: "upload",
  },
  seoTextField({
    name: "description",
    kind: "description",
    label: { en: "Meta description", es: "Meta descripción" },
    showButton: generation,
    generateOnPublish: generation,
  }),
  {
    defaultValue: robotsDefault,
    label: { en: "Robots", es: "Robots" },
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
