import type { Field } from "payload";

/** Shared by the page block and the inline (post body) variant. */
export const videoEmbedFields: Field[] = [
  {
    type: "row",
    fields: [
      {
        admin: { width: "30%" },
        defaultValue: "youtube",
        label: { en: "Provider", es: "Proveedor" },
        name: "provider",
        options: [{ label: "YouTube", value: "youtube" }],
        required: true,
        type: "select",
      },
      {
        admin: {
          width: "70%",
          description: {
            en: "The id from the video URL, e.g. dQw4w9WgXcQ",
            es: "El id de la URL del vídeo, p. ej. dQw4w9WgXcQ",
          },
        },
        label: { en: "Video id", es: "Id del vídeo" },
        name: "videoId",
        type: "text",
      },
    ],
  },
  {
    admin: {
      description: {
        en: "Shown on the poster and used as the player's accessible name",
        es: "Se muestra en la portada y es el nombre accesible del reproductor",
      },
    },
    label: { en: "Title", es: "Título" },
    localized: true,
    name: "title",
    required: true,
    type: "text",
  },
  {
    type: "row",
    fields: [
      {
        admin: {
          width: "60%",
          description: {
            en: "Optional. Without it a branded poster is generated — nothing loads from YouTube before play.",
            es: "Opcional. Sin ella se genera una portada de marca; nada se carga de YouTube antes de reproducir.",
          },
        },
        label: { en: "Poster", es: "Portada" },
        name: "poster",
        relationTo: "media",
        type: "upload",
      },
      {
        admin: { width: "40%" },
        defaultValue: "16/9",
        label: { en: "Aspect ratio", es: "Proporción" },
        name: "aspect",
        options: [
          { label: "16:9", value: "16/9" },
          { label: "4:3", value: "4/3" },
        ],
        type: "select",
      },
    ],
  },
];
