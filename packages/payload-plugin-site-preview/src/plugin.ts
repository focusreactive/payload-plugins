import type { CollectionConfig, Plugin } from "payload";

import { previewEndpoints } from "./endpoints.js";
import { ENDPOINT } from "./lib/constants.js";
import type { SitePreviewOptions } from "./types.js";

const LISTENER = "@focus-reactive/payload-plugin-site-preview/client#ClickToEditListener";

// The admin's live preview frame shows the site's own render of the document, proxied through the
// CMS; `v` only makes the admin reload the frame after a save. The listener goes into the document
// controls, which render inside the form — no field in the schema.
const withPreview = (collection: CollectionConfig): CollectionConfig => ({
  ...collection,
  admin: {
    ...collection.admin,
    livePreview: {
      ...collection.admin?.livePreview,
      url: ({ data, req }) =>
        data?.id
          ? `${req.payload.config.serverURL}${req.payload.config.routes.api}${ENDPOINT}/${collection.slug}/${data.id}?v=${encodeURIComponent(data.updatedAt ?? "")}`
          : null,
    },
    components: {
      ...collection.admin?.components,
      edit: {
        ...collection.admin?.components?.edit,
        beforeDocumentControls: [
          ...(collection.admin?.components?.edit?.beforeDocumentControls ?? []),
          LISTENER,
        ],
      },
    },
  },
});

export const sitePreviewPlugin =
  (options: SitePreviewOptions): Plugin =>
  (config) => ({
    ...config,
    endpoints: [...(config.endpoints ?? []), ...previewEndpoints(options)],
    collections: config.collections?.map((collection) =>
      options.collections.includes(collection.slug) ? withPreview(collection) : collection
    ),
  });
