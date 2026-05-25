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
      name: "author",
      type: "text",
      required: true,
      label: {
        en: "Author",
        es: "Autor",
      },
    },
    {
      name: "company",
      type: "text",
      label: {
        en: "Company",
        es: "Empresa",
      },
    },
    {
      name: "position",
      type: "text",
      label: {
        en: "Position",
        es: "Posición",
      },
      localized: true,
    },
    {
      name: "avatar",
      type: "upload",
      relationTo: "media",
      label: {
        en: "Avatar",
        es: "Avatar",
      },
    },
    {
      name: "content",
      type: "textarea",
      required: true,
      label: {
        en: "Review",
        es: "Reseña",
      },
      localized: true,
    },
    {
      name: "rating",
      type: "number",
      min: 1,
      max: 5,
      defaultValue: 5,
      label: {
        en: "Rating (1-5)",
        es: "Calificación (1-5)",
      },
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
