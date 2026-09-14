/**
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
import { talkKindOptions, talkTierOptions } from "@/lib/talks/taxonomy";

/**
 * Both lists and the words shown for each now live in lib/talks/taxonomy.ts, so the dropdown in the
 * panel and the badge on the page cannot drift apart. Re-exported here because the renderer, the
 * seed script and the "view as" switch all import them from this path.
 */
export { TALK_KINDS, TALK_TIERS } from "@/lib/talks/taxonomy";

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
      admin: {
        description:
          "What this teaching is called. Used as the page heading, on every listing card, and as the link title when someone shares it.",
      },
      label: "Title",
      localized: true,
      name: "title",
      required: true,
      type: "text",
    },
    {
      // Two tabs so the document reads the way a Page document does - the editor lands on
      // Content and finds SEO beside it, rather than meeting a lone SEO tab under a long form.
      // The Content tab is UNNAMED, which in Payload is presentational: every field inside it
      // is still stored at the top level of the document, so this is a layout change with no
      // schema delta and no migration.
      //
      // generateSeoFields() MUST stay nested in the NAMED tab. It emits its own `title` and
      // `description`, so spreading it next to the collection's own `title` throws
      // DuplicateFieldName at config build - a runtime failure that typechecks clean, so it is
      // only ever found by starting Payload. `name: "meta"` also matches how the renderer reads
      // it (talk.meta?.title) and how Posts and Page both do it.
      type: "tabs",
      tabs: [
        {
          fields: [
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
                  admin: {
                    description:
                      "Which part of the archive this belongs to. Decides the label on the card and which listings it appears in.",
                    width: "50%",
                  },
                  label: "Kind",
                  name: "kind",
                  options: talkKindOptions(),
                  required: true,
                  type: "select",
                },
                {
                  admin: {
                    description:
                      "The membership someone needs before the body unlocks. The title, teaser, topics and summary stay public whichever you pick, so the page is still found in search.",
                    width: "50%",
                  },
                  defaultValue: "visitor",
                  label: "Members only from",
                  name: "requiredTier",
                  options: talkTierOptions(),
                  required: true,
                  type: "select",
                },
              ],
            },
            {
              admin: {
                description:
                  "The opening someone reads before the membership gate. It also appears on listing cards and in search results, so write it to stand on its own. Two or three sentences.",
              },
              label: "Teaser",
              localized: true,
              name: "teaser",
              type: "textarea",
            },
            {
              admin: {
                description:
                  "The full teaching. Everything here is hidden from anyone below the membership set above.",
              },
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
                  admin: {
                    description:
                      "The date shown on the page. Listings are ordered newest first by this, not by when you created the item.",
                    width: "50%",
                  },
                  label: "Published at",
                  name: "publishedAt",
                  type: "date",
                },
                {
                  admin: {
                    description:
                      "How long the audio runs, counted in seconds. Readers see it as “7 min”. A 7 minute 15 second recording is 435.",
                    width: "50%",
                  },
                  label: "Length of the audio, in seconds",
                  min: 0,
                  name: "durationSeconds",
                  type: "number",
                },
              ],
            },
            {
              admin: {
                description:
                  "Web address of the recording. Use the permanent link to the file - a temporary or expiring share link stops playing within a day. Leave empty for an item with no audio.",
              },
              label: "Link to the audio",
              name: "audioUrl",
              type: "text",
            },
            {
              admin: {
                description:
                  "The subjects this teaching covers. Each one gives the item a place in Browse Topics, and a reader who finishes it is offered the rest of that topic. Two or three is usually right.",
              },
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
                  "The page this item was brought over from. Filled in automatically and kept for reference - nothing to edit here.",
                position: "sidebar",
                readOnly: true,
              },
              label: "Brought over from",
              name: "sourceUrl",
              type: "text",
            },
          ],
          label: { en: "Content", es: "Contenido" },
        },
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
