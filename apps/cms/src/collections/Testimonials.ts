import type { CollectionConfig } from "payload";

import { anyone, or, user, superAdmin } from "@/lib/access";

export const Testimonials: CollectionConfig<"testimonials"> = {
  access: {
    create: or(superAdmin, user),
    delete: or(superAdmin, user),
    read: anyone,
    update: or(superAdmin, user),
  },
  admin: {
    defaultColumns: ["author", "rating", "clinic", "doctor", "updatedAt"],
    group: "Content",
    listSearchableFields: ["author", "place", "content"],
    useAsTitle: "author",
  },
  fields: [
    {
      fields: [
        {
          admin: { width: "60%" },
          label: {
            en: "Author",
            es: "Autor",
          },
          name: "author",
          required: true,
          type: "text",
        },
        {
          admin: { width: "40%" },
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
      type: "row",
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
    {
      fields: [
        {
          admin: {
            description:
              "The clinic or place shown under the reviewer's name, for example Downtown. Empty uses the clinic this review is about.",
            width: "50%",
          },
          label: "Place",
          name: "place",
          type: "text",
        },
        {
          admin: {
            description:
              "The logo of the site the review was left on, for example Google. Empty shows no logo.",
            width: "50%",
          },
          label: "Review site logo",
          name: "sourceLogo",
          relationTo: "media",
          type: "upload",
        },
      ],
      type: "row",
    },
    {
      admin: { initCollapsed: true },
      fields: [
        {
          fields: [
            {
              admin: { width: "50%" },
              label: {
                en: "Company",
                es: "Empresa",
              },
              name: "company",
              type: "text",
            },
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
          ],
          type: "row",
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
      ],
      label: { en: "More about the reviewer", es: "Más sobre quien opina" },
      type: "collapsible",
    },
    {
      admin: {
        position: "sidebar",
        description: "The clinic this review is about. The clinic's page shows its own reviews.",
      },
      index: true,
      label: "Clinic",
      name: "clinic",
      relationTo: "clinics",
      type: "relationship",
    },
    {
      admin: {
        position: "sidebar",
        description: "The doctor this review is about. The doctor's page shows their own reviews.",
      },
      index: true,
      label: "Doctor",
      name: "doctor",
      relationTo: "doctors",
      type: "relationship",
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
