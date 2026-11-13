import type { CollectionConfig, PayloadRequest } from "payload";

import {
  entityAccess,
  entityAdmin,
  entityHooks,
  entitySectionsField,
  entitySeoTab,
  entitySlugField,
  entityVersions,
  ratingFields,
} from "./shared";

const resolveStateSlug = async (
  data: Record<string, unknown> | undefined,
  req: PayloadRequest
): Promise<string | null> => {
  const state = data?.state;

  if (!state) {
    return null;
  }

  if (typeof state === "object" && "slug" in state && typeof state.slug === "string") {
    return state.slug;
  }

  if (typeof state !== "number" && typeof state !== "string") {
    return null;
  }

  const stateDoc = await req.payload
    .findByID({ collection: "states", depth: 0, draft: true, id: state, req })
    .catch(() => null);

  return stateDoc?.slug ?? null;
};

export const WEEK_DAYS = [
  { label: "Monday", value: "monday" },
  { label: "Tuesday", value: "tuesday" },
  { label: "Wednesday", value: "wednesday" },
  { label: "Thursday", value: "thursday" },
  { label: "Friday", value: "friday" },
  { label: "Saturday", value: "saturday" },
  { label: "Sunday", value: "sunday" },
] as const;

export const Clinics: CollectionConfig<"clinics"> = {
  access: entityAccess,
  admin: entityAdmin({
    collection: "clinics",
    defaultColumns: ["name", "state", "phone", "updatedAt"],
    resolveStateSlug,
    useAsTitle: "name",
  }),
  fields: [
    {
      tabs: [
        {
          fields: [
            {
              admin: {
                description:
                  "The clinic's short name, shown in lists, the footer and breadcrumbs, for example Downtown.",
              },
              label: "Name",
              name: "name",
              required: true,
              type: "text",
            },
            {
              admin: {
                description:
                  "The big heading at the top of the clinic's page. Empty uses the clinic's name.",
              },
              label: "Page heading",
              localized: true,
              name: "heroTitle",
              type: "text",
            },
            {
              admin: { description: "The smaller line under the page heading." },
              label: "Page subheading",
              localized: true,
              name: "heroSubtitle",
              type: "text",
            },
            {
              admin: {
                description:
                  "A paragraph about this clinic, shown on its page and sent to search engines.",
              },
              label: "About this clinic",
              localized: true,
              name: "description",
              type: "textarea",
            },
            {
              admin: {
                description:
                  "Neighbourhoods and towns this clinic serves, one per entry, for example Plano.",
              },
              hasMany: true,
              label: "Located near",
              localized: true,
              name: "locatedNear",
              type: "text",
            },
            {
              admin: {
                description: "The photo at the top of the clinic's page and on its cards.",
              },
              label: "Photo",
              name: "photo",
              relationTo: "media",
              type: "upload",
            },
            entitySectionsField(
              "The sections of the clinic's page under its heading, top to bottom."
            ),
          ],
          label: "Content",
        },
        {
          fields: [
            {
              admin: {
                description: "The clinic's own phone number, for example 469-555-0100.",
              },
              label: "Phone",
              name: "phone",
              type: "text",
            },
            {
              admin: { hideGutter: true },
              fields: [
                {
                  admin: {
                    description: "Street and suite, for example 1105 Central Expy N, Suite 2240.",
                  },
                  label: "Street",
                  name: "street",
                  type: "text",
                },
                {
                  fields: [
                    {
                      admin: { width: "50%" },
                      label: "City",
                      name: "city",
                      type: "text",
                    },
                    {
                      admin: { description: "Two letters, for example TX.", width: "20%" },
                      label: "State code",
                      maxLength: 2,
                      name: "region",
                      type: "text",
                    },
                    {
                      admin: { width: "30%" },
                      label: "ZIP code",
                      name: "postalCode",
                      type: "text",
                    },
                  ],
                  type: "row",
                },
              ],
              label: "Address",
              name: "address",
              type: "group",
            },
            {
              admin: {
                description:
                  "The Google Maps link the Get Directions button opens, for example https://maps.app.goo.gl/abc.",
              },
              label: "Map URL",
              name: "mapUrl",
              type: "text",
            },
            {
              admin: {
                description: "Where the pin sits on the map. Copy both numbers from Google Maps.",
                hideGutter: true,
              },
              fields: [
                {
                  fields: [
                    {
                      admin: { width: "50%" },
                      label: "Latitude",
                      name: "latitude",
                      type: "number",
                    },
                    {
                      admin: { width: "50%" },
                      label: "Longitude",
                      name: "longitude",
                      type: "number",
                    },
                  ],
                  type: "row",
                },
              ],
              label: "Map position",
              name: "geo",
              type: "group",
            },
            {
              admin: {
                components: { RowLabel: "@/components/admin/RowLabel#RowLabel" },
                description:
                  "One row per day. Change a row here and the clinic's page, its state's page and search engines all show the new hours.",
                initCollapsed: true,
              },
              fields: [
                {
                  fields: [
                    {
                      admin: { width: "34%" },
                      label: "Day",
                      name: "day",
                      options: [...WEEK_DAYS],
                      required: true,
                      type: "select",
                    },
                    {
                      admin: {
                        condition: (_, siblingData) => !siblingData?.closed,
                        description: "24-hour time, for example 08:00.",
                        width: "22%",
                      },
                      label: "Opens",
                      name: "opens",
                      type: "text",
                    },
                    {
                      admin: {
                        condition: (_, siblingData) => !siblingData?.closed,
                        description: "24-hour time, for example 19:00.",
                        width: "22%",
                      },
                      label: "Closes",
                      name: "closes",
                      type: "text",
                    },
                    {
                      admin: { style: { alignSelf: "center" }, width: "22%" },
                      defaultValue: false,
                      label: "Closed all day",
                      name: "closed",
                      type: "checkbox",
                    },
                  ],
                  type: "row",
                },
              ],
              label: "Opening hours",
              labels: { plural: "Days", singular: "Day" },
              name: "hours",
              type: "array",
            },
            ratingFields,
            {
              admin: {
                allowCreate: false,
                description:
                  "Every doctor whose Clinics list includes this one. Add a doctor here by editing the doctor.",
              },
              collection: "doctors",
              label: "Doctors at this clinic",
              name: "doctors",
              on: "clinics",
              type: "join",
            },
          ],
          label: "Clinic details",
        },
        entitySeoTab,
      ],
      type: "tabs",
    },
    entitySlugField("The last part of the clinic page's URL, for example downtown."),
    {
      admin: {
        description: "The state this clinic is in. It is part of the clinic page's URL.",
        position: "sidebar",
      },
      index: true,
      label: "State",
      name: "state",
      relationTo: "states",
      required: true,
      type: "relationship",
    },
    {
      admin: {
        description: "Shows the accreditation section on this clinic's page.",
        position: "sidebar",
      },
      defaultValue: true,
      label: "Accredited clinic",
      name: "accredited",
      type: "checkbox",
    },
  ],
  hooks: entityHooks,
  labels: { plural: "Clinics", singular: "Clinic" },
  slug: "clinics",
  versions: entityVersions,
};
