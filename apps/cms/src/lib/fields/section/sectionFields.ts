import type { GroupField } from "payload";

export const sectionFields: GroupField = {
  fields: [
    {
      type: "row",
      fields: [
        {
          admin: { width: "50%" },
          label: "Theme",
          name: "theme",
          options: [
            { label: "Light", value: "light" },
            { label: "Dark", value: "dark" },
            { label: "Light Gray", value: "light-gray" },
            { label: "Dark Gray", value: "dark-gray" },
          ],
          type: "select",
        },
        {
          admin: { width: "50%" },
          defaultValue: "base",
          label: "Max Width",
          name: "maxWidth",
          options: [
            { label: "None", value: "none" },
            { label: "Base", value: "base" },
          ],
          type: "select",
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          admin: { width: "50%" },
          defaultValue: "base",
          label: "Padding Y",
          name: "paddingY",
          options: [
            { label: "None", value: "none" },
            { label: "Base", value: "base" },
            { label: "Large", value: "large" },
          ],
          type: "select",
        },
        {
          admin: { width: "50%" },
          defaultValue: "base",
          label: "Padding X",
          name: "paddingX",
          options: [
            { label: "None", value: "none" },
            { label: "Base", value: "base" },
          ],
          type: "select",
        },
      ],
    },
    {
      fields: [
        {
          admin: {
            description: 'Upload an image or video. Use the "Background" folder.',
          },
          filterOptions: () => ({
            "folder.name": {
              equals: "Background",
            },
          }),
          label: "Background (Image or Video)",
          name: "media",
          relationTo: "media",
          type: "upload",
        },
        {
          fields: [
            {
              name: "overlay",
              type: "select",
              dbName: "sec_bg_ovrly",
              label: "Overlay Color",
              options: [
                { label: "Black", value: "black" },
                { label: "White", value: "white" },
              ],
              admin: {
                width: "50%",
                condition: (_, siblingData) => !!siblingData?.media,
              },
            },
            {
              name: "opacity",
              type: "number",
              label: "Overlay Opacity (%)",
              min: 0,
              max: 100,
              defaultValue: 35,
              admin: {
                width: "50%",
                condition: (_, siblingData) => !!siblingData?.overlay,
                description: "0 = transparent, 100 = fully opaque",
              },
            },
          ],
          type: "row",
        },
      ],
      label: "Background",
      name: "background",
      type: "group",
    },
  ],
  label: false,
  name: "section",
  type: "group",
};
