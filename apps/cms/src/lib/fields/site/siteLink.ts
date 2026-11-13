import type { Field, GroupField, TextFieldSingleValidation } from "payload";

export type SiteLinkKind = "internal" | "relative" | "external";

/** Every routed collection, so the page picker offers every page an editor can make. */
export const ROUTED_COLLECTIONS = [
  "page",
  "posts",
  "states",
  "clinics",
  "doctors",
  "treatments",
  "conditions",
] as const;

interface SiteLinkOptions {
  name: string;
  label: string;
  description?: string;
  required?: boolean;
  defaultKind?: SiteLinkKind;
  condition?: NonNullable<GroupField["admin"]>["condition"];
}

const externalUrlPattern = /^(https?:\/\/\S+|mailto:\S+@\S+|tel:\+?[\d\s().-]{5,})$/iu;

const validatePath: TextFieldSingleValidation = (value, { siblingData }) => {
  if ((siblingData as { kind?: SiteLinkKind })?.kind !== "relative") {
    return true;
  }
  if (!value) {
    return true;
  }
  return value.startsWith("/") && !value.startsWith("//")
    ? true
    : "Start the URL with one slash, for example /contact.";
};

const validateUrl: TextFieldSingleValidation = (value, { siblingData }) => {
  if ((siblingData as { kind?: SiteLinkKind })?.kind !== "external") {
    return true;
  }
  if (!value) {
    return true;
  }
  return externalUrlPattern.test(value.trim())
    ? true
    : "Start with https://, mailto: or tel:, for example https://example.com or tel:+18005550100.";
};

/**
 * Every link an editor sets on a site section is this one field: a page picker for pages in the
 * CMS, a URL on this site for pages still in code, and a full URL that also takes an email or a
 * phone number.
 */
export function siteLink({
  name,
  label,
  description,
  required = false,
  defaultKind = "internal",
  condition,
}: SiteLinkOptions): Field {
  const isKind = (kind: SiteLinkKind) => (_: unknown, siblingData: { kind?: SiteLinkKind }) =>
    siblingData?.kind === kind;

  return {
    admin: { condition, description, hideGutter: true },
    fields: [
      {
        fields: [
          {
            admin: { layout: "horizontal", width: "75%" },
            defaultValue: defaultKind,
            label: "Where it goes",
            name: "kind",
            options: [
              { label: "A page in the CMS", value: "internal" },
              { label: "A URL on this site", value: "relative" },
              { label: "Another website, an email or a phone", value: "external" },
            ],
            required,
            type: "radio",
          },
          {
            admin: { style: { alignSelf: "flex-end" }, width: "25%" },
            label: "Open in a new tab",
            name: "newTab",
            type: "checkbox",
          },
        ],
        type: "row",
      },
      {
        admin: {
          condition: isKind("internal"),
          description: "Keeps working if the page is renamed or moved.",
        },
        label: "Page",
        name: "page",
        relationTo: [...ROUTED_COLLECTIONS],
        type: "relationship",
      },
      {
        admin: {
          condition: isKind("relative"),
          description:
            "For pages that are not in the CMS. Starts with a slash, for example /contact.",
        },
        label: "URL on this site",
        name: "path",
        type: "text",
        validate: validatePath,
      },
      {
        admin: {
          condition: isKind("external"),
          description:
            "A full URL (https://example.com), an email (mailto:hello@example.com) or a phone number (tel:+18005550100).",
        },
        label: "URL, email or phone",
        name: "url",
        type: "text",
        validate: validateUrl,
      },
    ],
    label,
    name,
    type: "group",
  };
}

/** A button on a section: its text and where it goes. */
export function siteButton({
  name = "button",
  label = "Button",
  description = "Empty text hides the button.",
}: { name?: string; label?: string; description?: string } = {}): Field {
  return {
    admin: { description, hideGutter: true },
    fields: [
      {
        admin: { description: "The words on the button, for example Book Now." },
        label: "Text",
        name: "text",
        type: "text",
      },
      siteLink({ label: "Links to", name: "link" }),
    ],
    label,
    name,
    type: "group",
  };
}
