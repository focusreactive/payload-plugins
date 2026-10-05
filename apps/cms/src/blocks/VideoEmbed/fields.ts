import type { Field } from "payload";

/** Shared by the page block and the inline (post body) variant. */
export const videoEmbedFields: Field[] = [
  {
    type: "row",
    fields: [
      {
        admin: { width: "30%" },
        defaultValue: "youtube",
        label: "Provider",
        name: "provider",
        options: [{ label: "YouTube", value: "youtube" }],
        required: true,
        type: "select",
      },
      {
        admin: {
          width: "70%",
          description: "The id from the video URL, e.g. dQw4w9WgXcQ",
        },
        label: "Video id",
        name: "videoId",
        type: "text",
      },
    ],
  },
  {
    admin: {
      description: "Shown on the poster and used as the player's accessible name",
    },
    label: "Title",
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
          description:
            "Optional. Without it a branded poster is generated — nothing loads from YouTube before play.",
        },
        label: "Poster",
        name: "poster",
        relationTo: "media",
        type: "upload",
      },
      {
        admin: { width: "40%" },
        defaultValue: "16/9",
        label: "Aspect ratio",
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
