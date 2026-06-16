import type { CollectionConfig } from "payload";

import { anyone, or, user, superAdmin } from "@/core/lib/access";

export const Testimonials: CollectionConfig<"testimonials"> = {
  access: {
    create: or(superAdmin, user),
    delete: or(superAdmin, user),
    read: anyone,
    update: or(superAdmin, user),
  },
  admin: {
    defaultColumns: ["author", "company", "rating", "createdAt"],
    group: "Content",
    useAsTitle: "author",
  },
  fields: [
    {
      type: "row",
      fields: [
        {
          admin: { width: "50%" },
          label: {
            en: "Author",
            es: "Autor",
          },
          name: "author",
          required: true,
          type: "text",
        },
        {
          admin: { width: "50%" },
          label: {
            en: "Company",
            es: "Empresa",
          },
          name: "company",
          type: "text",
        },
      ],
    },
    {
      type: "row",
      fields: [
        {
          admin: { width: "50%" },
          label: {
            en: "Position",
            es: "Posición",
          },
          localized: true,
          name: "position",
          type: "text",
        },
        {
          admin: { width: "50%" },
          defaultValue: 5,
          label: {
            en: "Rating (1-5)",
            es: "Calificación (1-5)",
          },
          max: 5,
          min: 1,
          name: "rating",
          type: "number",
        },
      ],
    },
    {
      label: {
        en: "Avatar",
        es: "Avatar",
      },
      name: "avatar",
      relationTo: "media",
      type: "upload",
    },
    {
      label: {
        en: "Review",
        es: "Reseña",
      },
      localized: true,
      name: "content",
      required: true,
      type: "textarea",
    },
  ],
  labels: {
    plural: {
      en: "Testimonials",
      es: "Testimonios",
    },
    singular: {
      en: "Testimonial",
      es: "Testimonio",
    },
  },
  slug: "testimonials",
  timestamps: true,
};
