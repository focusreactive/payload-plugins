import type { CollectionConfig, Config, GlobalConfig, Plugin } from "payload";

import { STACKED_EDITING_COMPONENT } from "./lib/constants.js";
import type { StackedEditingOptions } from "./types.js";

const includes = (allowList: string[] | undefined, slug: string): boolean =>
  allowList === undefined || allowList.includes(slug);

// `beforeDocumentControls` renders inside the document's <Form>, which is what lets the panels
// render the document's own fields (bound to the same form state) from there. A root provider
// (`admin.components.providers`) would sit outside the form and could not.
const withCollectionOutlet = (collection: CollectionConfig): CollectionConfig => ({
  ...collection,
  admin: {
    ...collection.admin,
    components: {
      ...collection.admin?.components,
      edit: {
        ...collection.admin?.components?.edit,
        beforeDocumentControls: [
          ...(collection.admin?.components?.edit?.beforeDocumentControls ?? []),
          STACKED_EDITING_COMPONENT,
        ],
      },
    },
  },
});

const withGlobalOutlet = (global: GlobalConfig): GlobalConfig => ({
  ...global,
  admin: {
    ...global.admin,
    components: {
      ...global.admin?.components,
      elements: {
        ...global.admin?.components?.elements,
        beforeDocumentControls: [
          ...(global.admin?.components?.elements?.beforeDocumentControls ?? []),
          STACKED_EDITING_COMPONENT,
        ],
      },
    },
  },
});

/**
 * Opens array and blocks rows in stacked drawers with breadcrumbs instead of expanding them inline.
 * Adds one client component per edit view; no fields, hooks or endpoints.
 */
export const stackedEditingPlugin =
  (options: StackedEditingOptions = {}): Plugin =>
  (config: Config): Config => {
    if (options.enabled === false) {
      return config;
    }
    return {
      ...config,
      collections: config.collections?.map((collection) =>
        includes(options.collections, collection.slug)
          ? withCollectionOutlet(collection)
          : collection
      ),
      globals: config.globals?.map((global) =>
        includes(options.globals, global.slug) ? withGlobalOutlet(global) : global
      ),
    };
  };
