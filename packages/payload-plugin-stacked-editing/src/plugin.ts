import type { Block, CollectionConfig, Config, Field, GlobalConfig, Plugin } from "payload";

import { STACKED_EDITING_COMPONENT } from "./lib/constants.js";
import { withCardLabelBlock, withCardLabelFields } from "./lib/withCardLabels.js";
import { withInitCollapsedBlock, withInitCollapsedFields } from "./lib/withInitCollapsed.js";
import type { StackedEditingOptions } from "./types.js";

const outletFor = (options: StackedEditingOptions) => ({
  path: STACKED_EDITING_COMPONENT,
  clientProps: { defaultMode: options.defaultMode ?? "panel" },
});

const includes = (allowList: string[] | undefined, slug: string): boolean =>
  allowList === undefined || allowList.includes(slug);

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

export const stackedEditing =
  (options: StackedEditingOptions = {}): Plugin =>
  (config: Config): Config => {
    if (options.enabled === false) {
      return config;
    }
    const cards = options.cards !== false;
    const collapsed = (options.defaultMode ?? "panel") === "panel";
    const withFields = <T extends { fields: Field[] }>(entity: T): T => {
      let fields = entity.fields;
      if (cards) fields = withCardLabelFields(fields);
      if (collapsed) fields = withInitCollapsedFields(fields);
      return { ...entity, fields };
    };
    const withBlock = (block: Block): Block => {
      let next = block;
      if (cards) next = withCardLabelBlock(next);
      if (collapsed) next = withInitCollapsedBlock(next);
      return next;
    };
    return {
      ...config,
      ...((cards || collapsed) && config.blocks ? { blocks: config.blocks.map(withBlock) } : {}),
      collections: config.collections?.map((collection) =>
        includes(options.collections, collection.slug)
          ? withCollectionOutlet(withFields(collection), outletFor(options))
          : collection
      ),
      globals: config.globals?.map((global) =>
        includes(options.globals, global.slug)
          ? withGlobalOutlet(withFields(global), outletFor(options))
          : global
      ),
    };
  };
