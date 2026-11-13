import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionConfig,
  Field,
  PayloadRequest,
  Tab,
  TextFieldSingleValidation,
} from "payload";

import { siteBlocks } from "@/blocks/siteBlocks";
import { anyone, author, or, superAdmin, user } from "@/lib/access";
import { entityPath, withLocalePrefix } from "@/lib/config/entityRoutes";
import type { EntityCollection } from "@/lib/config/entityRoutes";
import {
  LIVE_PREVIEW_BEFORE_DOCUMENT_CONTROLS,
  createLivePreviewVersions,
} from "@/lib/config/livePreview";
import { cacheTag } from "@/lib/utils/cacheTags";
import { generatePreviewPath } from "@/lib/utils/generatePreviewPath";
import { revalidateScopedTag } from "@/lib/utils/scopedCache";
import { generateSeoFields } from "@/lib/utils/seoFields";

export const ENTITY_ADMIN_GROUP = "Directory";

export const entityAccess: CollectionConfig["access"] = {
  create: or(superAdmin, user, author),
  delete: or(superAdmin, user),
  read: anyone,
  update: or(superAdmin, user, author),
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const validateSlug: TextFieldSingleValidation = (value) => {
  if (!value) {
    return "Type the last part of the page's URL, for example new-york.";
  }
  return slugPattern.test(value) ? true : "Use lowercase letters, numbers and hyphens only.";
};

export function entitySlugField(description: string): Field {
  return {
    admin: { description, position: "sidebar" },
    index: true,
    label: "Slug",
    name: "slug",
    required: true,
    type: "text",
    unique: true,
    validate: validateSlug,
  };
}

export function entitySectionsField(description: string): Field {
  return {
    admin: { description, initCollapsed: true },
    blocks: siteBlocks,
    label: "Sections",
    labels: { plural: "Sections", singular: "Section" },
    localized: true,
    name: "blocks",
    type: "blocks",
  };
}

export const entitySeoTab: Tab = {
  fields: generateSeoFields(),
  label: "SEO & Search",
  localized: true,
  name: "meta",
};

// A record feeds several pages at once (a clinic shows on its own page, its state's page, its
// doctors' pages and the footer), so one tag covers every record-driven read.
const revalidateEntityReads = (req: PayloadRequest): void => {
  if (req.context.disableRevalidate) {
    return;
  }
  revalidateScopedTag(cacheTag({ type: "entities" }), "max");
  revalidateScopedTag(cacheTag({ type: "sitemap" }), "max");
};

// A draft changes nothing a visitor sees, and the admin creates the first draft of an autosaved
// document while it renders the form, where clearing a cache tag is not allowed.
const revalidateAfterChange: CollectionAfterChangeHook = ({ doc, previousDoc, req }) => {
  if (doc?._status !== "draft" || previousDoc?._status === "published") {
    revalidateEntityReads(req);
  }

  return doc;
};

const revalidateAfterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  revalidateEntityReads(req);
  return doc;
};

export const entityHooks: CollectionConfig["hooks"] = {
  afterChange: [revalidateAfterChange],
  afterDelete: [revalidateAfterDelete],
};

export const entityVersions = createLivePreviewVersions();

type StateSlugResolver = (
  data: Record<string, unknown> | undefined,
  req: PayloadRequest
) => Promise<string | null>;

interface EntityAdminOptions {
  collection: EntityCollection;
  defaultColumns: string[];
  useAsTitle: string;
  /** Clinics only: finds the slug of the clinic's state, which is part of its URL. */
  resolveStateSlug?: StateSlugResolver;
}

export function entityAdmin({
  collection,
  defaultColumns,
  useAsTitle,
  resolveStateSlug,
}: EntityAdminOptions): CollectionConfig["admin"] {
  const previewUrl = async (
    data: Record<string, unknown> | undefined,
    locale: string,
    req: PayloadRequest
  ): Promise<string> => {
    const slug = typeof data?.slug === "string" ? data.slug : "";
    const stateSlug = resolveStateSlug ? await resolveStateSlug(data, req) : null;
    const path = entityPath({ collection, slug, stateSlug }) ?? "/";

    return generatePreviewPath({ collection, path: withLocalePrefix(path, locale), slug });
  };

  return {
    components: {
      edit: {
        beforeDocumentControls: LIVE_PREVIEW_BEFORE_DOCUMENT_CONTROLS,
      },
    },
    defaultColumns,
    group: ENTITY_ADMIN_GROUP,
    livePreview: {
      url: ({ data, locale, req }) =>
        previewUrl(data, locale?.code ?? locale?.fallbackLocale ?? "en", req),
    },
    preview: (data, { locale, req }) => previewUrl(data, locale, req),
    useAsTitle,
  };
}

export const ratingFields: Field = {
  admin: {
    description: "Shown next to the stars and sent to search engines with the page.",
    hideGutter: true,
  },
  fields: [
    {
      fields: [
        {
          admin: { description: "Average score out of 5, for example 4.9.", width: "50%" },
          label: "Average rating",
          max: 5,
          min: 1,
          name: "value",
          type: "number",
        },
        {
          admin: { description: "How many reviews the average is built from.", width: "50%" },
          label: "Number of reviews",
          min: 0,
          name: "count",
          type: "number",
        },
      ],
      type: "row",
    },
  ],
  label: "Reviews rating",
  name: "rating",
  type: "group",
};
