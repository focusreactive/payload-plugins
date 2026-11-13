import type { Field } from "payload";

import { bodyRichText, headingRichText } from "@/lib/fields/site/richText";
import { siteLink } from "@/lib/fields/site/siteLink";

const rowLabel = (prefix: string) => ({
  components: {
    RowLabel: {
      clientProps: { prefix, titleField: "label" },
      path: "@/components/admin/RowLabel#RowLabel",
    },
  },
  initCollapsed: true,
});

/** Fields the site's own header shows on top of the standard header fields. */
export const siteHeaderFields: Field[] = [
  {
    admin: {
      description: "A smaller logo for phones. Empty uses the main logo.",
    },
    label: "Phone logo",
    name: "mobileLogo",
    relationTo: "media",
    type: "upload",
  },
  {
    admin: {
      description: "The thin bar above the menu. Empty text hides it.",
      hideGutter: true,
    },
    fields: [
      {
        admin: { description: "The bar's words, for example Take the Vein Health Quiz." },
        label: "Text",
        localized: true,
        name: "text",
        type: "text",
      },
      siteLink({ label: "Links to", name: "link" }),
    ],
    label: "Announcement bar",
    name: "announcement",
    type: "group",
  },
  {
    admin: {
      description: "The phone number in the phone menu, for example 888-555-0100.",
    },
    label: "Phone",
    name: "phone",
    type: "text",
  },
  {
    admin: { description: "The words before the phone number, for example Or Call:." },
    label: "Phone line text",
    localized: true,
    name: "phoneLabel",
    type: "text",
  },
  {
    admin: {
      description:
        "The link to the clinics list in the phone header, for example See Locations. The number of clinics is added automatically.",
    },
    label: "Locations link text",
    localized: true,
    name: "locationsLabel",
    type: "text",
  },
  {
    admin: {
      ...rowLabel("Link"),
      description: "The second list of links in the phone menu, under the main menu.",
    },
    fields: [
      {
        admin: { description: "The link's words, for example Our Story." },
        label: "Text",
        localized: true,
        name: "label",
        required: true,
        type: "text",
      },
      siteLink({ label: "Links to", name: "link" }),
    ],
    label: "More links",
    labels: { plural: "Links", singular: "Link" },
    name: "moreLinks",
    type: "array",
  },
];

const SOCIAL_NETWORKS = [
  { label: "Facebook", value: "facebook" },
  { label: "YouTube", value: "youtube" },
  { label: "Instagram", value: "instagram" },
  { label: "TikTok", value: "tiktok" },
  { label: "Pinterest", value: "pinterest" },
  { label: "X (Twitter)", value: "twitter" },
  { label: "LinkedIn", value: "linkedin" },
] as const;

/** Fields the site's own footer shows on top of the standard footer fields. */
export const siteFooterFields: Field[] = [
  {
    admin: { description: "The phone number in the footer, for example 888-555-0100." },
    label: "Phone",
    name: "phone",
    type: "text",
  },
  {
    admin: {
      description:
        "The heading above the list of states and clinics, for example Find a clinic. The list itself is built from the States and Clinics.",
    },
    label: "Clinics list heading",
    localized: true,
    name: "locationsHeading",
    type: "text",
  },
  {
    admin: {
      description: "The short text about the company beside the clinics list.",
      hideGutter: true,
    },
    fields: [
      {
        admin: { description: "The small heading above the text." },
        label: "Heading",
        localized: true,
        name: "heading",
        type: "text",
      },
      bodyRichText({
        description:
          "One or two paragraphs. Links to state pages keep working when a state is renamed.",
        label: "Text",
        localized: true,
        name: "text",
      }),
    ],
    label: "About",
    name: "about",
    type: "group",
  },
  {
    admin: {
      components: {
        RowLabel: {
          clientProps: { prefix: "Profile", titleField: "network" },
          path: "@/components/admin/RowLabel#RowLabel",
        },
      },
      description: "The social media icons in the footer and the phone menu.",
      initCollapsed: true,
    },
    fields: [
      {
        fields: [
          {
            admin: { width: "35%" },
            label: "Network",
            name: "network",
            options: [...SOCIAL_NETWORKS],
            required: true,
            type: "select",
          },
          {
            admin: {
              description:
                "The profile's full URL, for example https://www.instagram.com/yourclinic.",
              width: "65%",
            },
            label: "Profile URL",
            name: "url",
            required: true,
            type: "text",
          },
        ],
        type: "row",
      },
    ],
    label: "Social media",
    labels: { plural: "Profiles", singular: "Profile" },
    name: "social",
    type: "array",
  },
  {
    admin: { description: "The note at the very bottom of every page.", hideGutter: true },
    fields: [
      {
        admin: { description: "The small heading above the note." },
        label: "Heading",
        localized: true,
        name: "heading",
        type: "text",
      },
      {
        admin: { description: "The note itself, one paragraph." },
        label: "Text",
        localized: true,
        name: "text",
        type: "textarea",
      },
    ],
    label: "Disclaimer",
    name: "disclaimer",
    type: "group",
  },
  {
    admin: {
      description: "The newsletter band above the footer on every page. Empty title hides it.",
      hideGutter: true,
    },
    fields: [
      headingRichText({
        description: "The band's large line. Set words in italics to give them the accent style.",
        label: "Title",
        localized: true,
        name: "title",
      }),
      {
        admin: { description: "One sentence under the title." },
        label: "Text",
        localized: true,
        name: "text",
        type: "text",
      },
      {
        admin: { description: "The words on the sign-up button, for example Subscribe." },
        label: "Button text",
        localized: true,
        name: "buttonText",
        type: "text",
      },
      {
        fields: [
          {
            admin: { description: "The wide picture behind the band on computers.", width: "50%" },
            label: "Picture",
            name: "image",
            relationTo: "media",
            type: "upload",
          },
          {
            admin: {
              description: "The picture behind the band on phones. Empty uses the wide one.",
              width: "50%",
            },
            label: "Phone picture",
            name: "mobileImage",
            relationTo: "media",
            type: "upload",
          },
        ],
        type: "row",
      },
    ],
    label: "Newsletter band",
    name: "newsletter",
    type: "group",
  },
];
