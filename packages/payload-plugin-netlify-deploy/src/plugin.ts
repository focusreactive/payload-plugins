import type { CollectionConfig, Plugin } from "payload";

import { deployEndpoints } from "./endpoints.js";
import { BUTTON_COMPONENT } from "./lib/constants.js";
import type { NetlifyDeployOptions } from "./types.js";

const button = (placement: "document" | "header") => ({
  path: BUTTON_COMPONENT,
  clientProps: { placement },
});

// Beside Save: the document controls render inside the form, so the button sees unsaved edits.
const withButton = (collection: CollectionConfig): CollectionConfig => ({
  ...collection,
  admin: {
    ...collection.admin,
    components: {
      ...collection.admin?.components,
      edit: {
        ...collection.admin?.components?.edit,
        beforeDocumentControls: [
          ...(collection.admin?.components?.edit?.beforeDocumentControls ?? []),
          button("document"),
        ],
      },
    },
  },
});

export const netlifyDeployPlugin =
  (options: NetlifyDeployOptions): Plugin =>
  (config) => ({
    ...config,
    endpoints: [...(config.endpoints ?? []), ...deployEndpoints(options)],
    collections: config.collections?.map((collection) =>
      options.collections?.includes(collection.slug) ? withButton(collection) : collection
    ),
    admin: options.header
      ? {
          ...config.admin,
          components: {
            ...config.admin?.components,
            actions: [...(config.admin?.components?.actions ?? []), button("header")],
          },
        }
      : config.admin,
  });
