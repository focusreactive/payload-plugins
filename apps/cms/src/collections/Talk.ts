/**
 * STAGED SOURCE - not yet applied. Destination on the sandbox branch:
 *   apps/cms/src/collections/Talk.ts
 *
 * One collection for what their Magento models as five separate attribute sets (thirty in total).
 * That collapse IS the argument being made on the call: their content was never thirty different
 * things, a product catalogue only forced it to be. So `kind` is a field, not a collection.
 *
 * Labels here are plain strings, not the { en, es } objects the rest of the repo uses on
 * collections. That is deliberate: Payload 3.84 renders an object label as "[object Object]" in
 * list-view sort buttons and create tooltips (client-sandboxes.md, "Custom code on a sandbox
 * branch"). Blocks are unaffected and keep the localized form.
 */

import type { CollectionConfig } from "payload";

import { anyone, author, or, superAdmin, user } from "@/lib/access";
import { slugField } from "payload";
import { generatePreviewPath } from "@/lib/utils/generatePreviewPath";
import { generateSeoFields } from "@/lib/utils/seoFields";

import { talkAiFields } from "@/lib/fields/talkAiFields";

/**
 * Their live tiers, in ascending order. `visitor` is not one of the client's tiers - it is the
 * absence of a membership, and it exists here so a document can be marked freely readable.
 */
export const TALK_TIERS = ["visitor", "basic", "premium", "all-access"] as const;

export const TALK_KINDS = [
  "featured-talk",
  "short-talk",
  "special-lesson",
  "student-qa",
  "study-group-discussion",
  "article",
  "blog",
  "letter",
  "insight-timer-talk",
] as const;

export const Talk: CollectionConfig<"talk"> = {
  access: {
    create: or(superAdmin, user, author),
    delete: or(superAdmin, user, author),
    // Read is open at the API layer. The paywall is applied when RENDERING a talk, not by hiding
    // documents: the listing row and the SEO metadata of a gated item must stay crawlable, because
    // being findable is the entire point of the engagement. See lib/talks/applyTier.ts.
    read: anyone,
    update: or(superAdmin, user, author),
  },
  admin: {
    defaultColumns: ["title", "kind", "requiredTier", "publishedAt", "updatedAt"],
    group: "Content",
    livePreview: {
      url: ({ data }) =>
        generatePreviewPath({ collection: "talk", path: `/talks/${data?.slug}`, slug: data?.slug }),
    },
    preview: (data) =>
      generatePreviewPath({
        collection: "talk",
        path: `/talks/${data?.slug}`,
        slug: data?.slug as string,
      }),
    useAsTitle: "title",
  },
  fields: [
    {
      label: "Title",
      localized: true,
      name: "title",
      required: true,
      type: "text",
    },
    // NOT createSharedSlugField, which is typed ("page" | "posts") and cross-validates a slug
    // against the other of those two collections. Talks live under /talks/<slug>, so they cannot
    // collide with a page or a post path and need only per-collection uniqueness.
    //
    // Not spread: slugField returns a single RowField (a text input plus a "generate" checkbox),
    // not an array. `useAsSlug` rather than the deprecated `fieldToUse`.
    slugField({ required: true, useAsSlug: "title" }),
    {
      type: "row",
      fields: [
        {
          admin: { width: "50%" },
          label: "Kind",
          name: "kind",
          options: TALK_KINDS.map((value) => ({
            label: value.replace(/-/gu, " ").replace(/\b\w/gu, (letter) => letter.toUpperCase()),
            value,
          })),
          required: true,
          type: "select",
        },
        {
          admin: {
            description:
              "What a reader needs in order to read this item's body. Editorial metadata about the ITEM - never a record of who paid. Entitlement lives in Braintree and reaches the app through the identity layer; the CMS must not store it.",
            width: "50%",
          },
          defaultValue: "visitor",
          label: "Required tier",
          name: "requiredTier",
          options: TALK_TIERS.map((value) => ({
            label: value === "visitor" ? "Free - no membership" : value,
            value,
          })),
          required: true,
          type: "select",
        },
      ],
    },
    {
      admin: {
        description:
          "Shown to readers below the tier, and indexed. Their site already ships this - the anonymous view of a gated talk carries about 41% of the member text - so a teaser is a rewrite of something that exists, not a new feature.",
      },
      label: "Teaser",
      localized: true,
      name: "teaser",
      type: "textarea",
    },
    {
      label: "Body",
      localized: true,
      name: "body",
      required: true,
      type: "richText",
    },
    {
      type: "row",
      fields: [
        {
          admin: { width: "50%" },
          label: "Published at",
          name: "publishedAt",
          type: "date",
        },
        {
          admin: {
            description:
              "Real length in seconds. Never read this from their JSON-LD, which says T1M15S on every talk on the site.",
            width: "50%",
          },
          label: "Duration (seconds)",
          min: 0,
          name: "durationSeconds",
          type: "number",
        },
      ],
    },
    {
      admin: {
        description:
          "Streams from the foundation's own S3 bucket. The objects are public-read once the decorative SigV2 query string is stripped, so no key and no client action is needed. Do not store a presigned URL - theirs expire the day they are generated.",
      },
      label: "Audio URL",
      name: "audioUrl",
      type: "text",
    },
    {
      hasMany: true,
      label: "Topics",
      name: "topics",
      relationTo: "topic",
      type: "relationship",
    },
    ...talkAiFields,
    {
      admin: {
        description:
          "Where this item came from in their Magento, kept so any figure in the demo can be traced back.",
        position: "sidebar",
        readOnly: true,
      },
      label: "Source URL",
      name: "sourceUrl",
      type: "text",
    },
    {
      // generateSeoFields() MUST be nested in a named tab, not spread at the collection root.
      // It emits its own `title` and `description`, so spreading it next to the collection's own
      // `title` throws DuplicateFieldName at config build - a runtime failure that typechecks
      // clean, so it is only ever found by starting Payload. `name: "meta"` also matches how the
      // renderer reads it (talk.meta?.title) and how Posts and Page both do it.
      type: "tabs",
      tabs: [
        {
          fields: generateSeoFields({ generation: true }),
          label: { en: "SEO", es: "SEO" },
          localized: true,
          name: "meta",
        },
      ],
    },
  ],
  labels: {
    plural: "Talks",
    singular: "Talk",
  },
  slug: "talk",
  timestamps: true,
  versions: { drafts: true },
};
