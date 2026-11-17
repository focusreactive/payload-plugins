import type { CollectionConfig, Config, Field, GlobalConfig, Plugin } from "payload";

import { STACKED_EDITING_COMPONENT } from "./lib/constants.js";
import { withCardLabelBlock, withCardLabelFields } from "./lib/withCardLabels.js";
import type { StackedEditingOptions } from "./types.js";

const outletFor = (options: StackedEditingOptions) => ({
  path: STACKED_EDITING_COMPONENT,
  clientProps: { defaultMode: options.defaultMode ?? "panel" },
});

const includes = (allowList: string[] | undefined, slug: string): boolean =>
  allowList === undefined || allowList.includes(slug);

// `beforeDocumentControls` renders inside the document's <Form>, which is what lets the panels
// render the document's own fields (bound to the same form state) from there. A root provider
// (`admin.components.providers`) would sit outside the form and could not.
const withCollectionOutlet = (
  collection: CollectionConfig,
  outlet: ReturnType<typeof outletFor>
): CollectionConfig => ({
  ...collection,
  admin: {
    ...collection.admin,
    components: {
      ...collection.admin?.components,
      edit: {
        ...collection.admin?.components?.edit,
        beforeDocumentControls: [
          ...(collection.admin?.components?.edit?.beforeDocumentControls ?? []),
          outlet,
        ],
      },
    },
  },
});

const withGlobalOutlet = (
  global: GlobalConfig,
  outlet: ReturnType<typeof outletFor>
): GlobalConfig => ({
  ...global,
  admin: {
    ...global.admin,
    components: {
      ...global.admin?.components,
      elements: {
        ...global.admin?.components?.elements,
        beforeDocumentControls: [
          ...(global.admin?.components?.elements?.beforeDocumentControls ?? []),
          outlet,
        ],
      },
    },
  },
});

/**
 * Opens array and blocks rows in stacked drawers with breadcrumbs instead of expanding them inline.
 * Adds one client component per edit view and, unless `cards: false`, a row card label to arrays
 * and blocks that have no label of their own. No fields, hooks or endpoints.
 */
export const stackedEditing =
  (options: StackedEditingOptions = {}): Plugin =>
  (config: Config): Config => {
    if (options.enabled === false) {
      return config;
    }
    const cards = options.cards !== false;
    const withCards = <T extends { fields: Field[] }>(entity: T): T =>
      cards ? { ...entity, fields: withCardLabelFields(entity.fields) } : entity;
    return {
      ...config,
      // Config-level blocks (used through `blockReferences`) are shared, so all of them get cards.
      ...(cards && config.blocks ? { blocks: config.blocks.map(withCardLabelBlock) } : {}),
      collections: config.collections?.map((collection) =>
        includes(options.collections, collection.slug)
          ? withCollectionOutlet(withCards(collection), outletFor(options))
          : collection
      ),
      globals: config.globals?.map((global) =>
        includes(options.globals, global.slug)
          ? withGlobalOutlet(withCards(global), outletFor(options))
          : global
      ),
    };
  };
