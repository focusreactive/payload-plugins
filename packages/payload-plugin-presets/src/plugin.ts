import type {
  Access,
  Block,
  CollectionConfig,
  CollectionSlug,
  Config,
  Field,
  Plugin,
  StaticLabel,
} from "payload";

import packageJson from "../package.json";

/** Default npm package name */
const DEFAULT_PACKAGE_NAME = packageJson.name;

/**
 * Generates component path for Payload admin components.
 *
 * For npm packages: 'package-name/client#ComponentName'
 * For local dev: 'basePath/componentPath#ComponentName'
 *
 * @param packageName - npm package name or local path (e.g. '@focusreactive/payload-plugin-presets' or '@/plugins/presetsPlugin')
 * @param componentPath - relative path within plugin (e.g. 'components/PresetAdminComponentPreview')
 * @param componentName - exported component name
 */
export function getPluginComponentPath(
  packageName: string | undefined,
  componentPath: string,
  componentName: string,
  entry: "client" | "rsc" = "client"
): string {
  const resolvedName = packageName ?? DEFAULT_PACKAGE_NAME;

  // If it looks like a local path (@/ or ./ or ../), use full component path
  if (
    resolvedName.startsWith("@/") ||
    resolvedName.startsWith("./") ||
    resolvedName.startsWith("../")
  ) {
    return `${resolvedName}/${componentPath}#${componentName}`;
  }

  // For npm package: 'package-name/client#Component' or 'package-name/rsc#Component'
  return `${resolvedName}/${entry}#${componentName}`;
}

/** Client-side config stored in admin.custom.presetsPlugin */
export interface PresetsPluginClientConfig {
  slug: CollectionSlug;
  presetTypes: string[];
  /** Keys to exclude at all nesting levels (id, blockType, etc.) */
  excludeKeys: string[];
  /** Media collection slug for preview images (default: 'media') */
  mediaCollection: string;
}

export interface PresetType {
  /** Block slug to target — must match block.slug exactly */
  slug: string;
  /** Optional — falls back to block.labels.singular or slug */
  label?: StaticLabel;
  /** Optional — falls back to block.fields */
  fields?: Field[];
}

/** Internal resolved shape — all fields required after merging blockMap + overrides */
interface ResolvedPresetType {
  slug: string;
  label: StaticLabel;
  fields: Field[];
}

export interface PresetsPluginConfig {
  slug?: string;
  labels?: CollectionConfig["labels"];
  enabled?: boolean;
  /**
   * Override package name for component resolution.
   * Defaults to '@focusreactive/payload-plugin-presets'.
   * Set to a local path (e.g. '@/plugins/presetsPlugin') for local dev without npm.
   */
  packageName?: string;
  /** Media collection slug for preview images (default: 'media') */
  mediaCollection?: string;
  /** Override list — optional, defaults to [] */
  presetTypes?: PresetType[];
  /** Collection overrides */
  overrides?: {
    /** Access control */
    access?: {
      create?: Access;
      read?: Access;
      update?: Access;
      delete?: Access;
    };
    /** Modify fields - receives default fields, return final fields */
    fields?: (defaultFields: Field[]) => Field[];
    /** All collection hooks */
    hooks?: CollectionConfig["hooks"];
    /** Admin config overrides */
    admin?: Partial<CollectionConfig["admin"]>;
  };
}

const createPresetsCollection = (
  config: PresetsPluginConfig | undefined,
  resolvedPresetTypes: ResolvedPresetType[]
): CollectionConfig<"presets"> => {
  const {
    overrides = {},
    slug = "presets",
    labels = {
      plural: { en: "Presets", es: "Presets" },
      singular: { en: "Preset", es: "Preset" },
    },
    packageName,
    mediaCollection = "media",
  } = config ?? {};

  const previewFieldPath = getPluginComponentPath(
    packageName,
    "components/PresetAdminComponentPreview",
    "PresetAdminComponentPreview"
  );

  const previewCellPath = getPluginComponentPath(
    packageName,
    "components/PresetAdminComponentCellWrapper",
    "PresetAdminComponentCellWrapper"
  );

  const defaultFields: Field[] = [
    {
      admin: {
        components: {
          Field: previewFieldPath,
        },
        position: "sidebar",
      },
      label: { en: "Preview", es: "Vista previa" },
      name: "previewDisplay",
      type: "ui",
    },
    {
      label: { en: "Preset Name", es: "Nombre del Preset" },
      localized: true,
      name: "name",
      required: true,
      type: "text",
    },
    {
      admin: {
        components: {
          Cell: previewCellPath,
        },
        description: {
          en: "The preview image for the preset",
          es: "La imagen de vista previa para el preset",
        },
      },
      name: "preview",
      relationTo: mediaCollection as CollectionSlug,
      type: "upload",
    },
    {
      blocks: resolvedPresetTypes.map(({ slug: typeSlug, label, fields }) => ({
        slug: typeSlug,
        labels: {
          singular: label,
          plural: label,
        },
        fields,
      })),
      label: { en: "Preset Block", es: "Bloque de Preset" },
      maxRows: 1,
      name: "presetBlock",
      required: true,
      type: "blocks",
    },
  ];

  const finalFields = overrides.fields
    ? overrides.fields(defaultFields)
    : defaultFields;

  return {
    access: overrides.access || {},
    admin: {
      defaultColumns: ["name", "preview", "updatedAt"],
      description: {
        en: "One preset = one block type. Add one block to store its field values.",
        es: "Un preset = un tipo de bloque. Añade un bloque para guardar sus valores.",
      },
      group: "Collections",
      hidden: false,
      useAsTitle: "name",
      ...overrides.admin,
    },
    fields: finalFields,
    hooks: overrides.hooks || {},
    labels,
    slug,
    timestamps: true,
  };
};

function getBlocksFieldWithPresetsPath(packageName?: string): string {
  return getPluginComponentPath(
    packageName,
    "components/blocksDrawer/BlocksFieldWithPresets",
    "BlocksFieldWithPresets"
  );
}

export function getBlockAdminComponents(
  block: Block,
  packageName?: string,
  userLabels?: unknown[]
): NonNullable<Block["admin"]>["components"] {
  const userLabel = block.admin?.components?.Label;

  if (userLabel) {
    userLabels?.push(userLabel);
    const wrapperPath = getPluginComponentPath(
      packageName,
      "components/presetActions/BlockLabelServerWrapper",
      "BlockLabelServerWrapper",
      "rsc"
    );
    const [path, exportName] = wrapperPath.split("#");
    return {
      Label: {
        clientProps: { userLabel },
        exportName,
        path,
      },
    };
  }

  return {
    Label: getPluginComponentPath(
      packageName,
      "components/presetActions/BlockLabelWithPresets",
      "BlockLabelWithPresets"
    ),
  };
}

function resolveBlockLabel(block: Block): StaticLabel {
  const singular = block.labels?.singular;

  if (!singular || typeof singular === "function") {return block.slug;}

  return singular;
}

function fieldIsBlockType(
  field: Field
): field is Extract<Field, { type: "blocks" }> {
  return field.type === "blocks";
}

function fieldHasSubFields(
  field: Field
): field is Extract<Field, { fields: Field[] }> {
  return (
    "fields" in field && Array.isArray((field as { fields?: unknown }).fields)
  );
}

function transformFields(
  fields: Field[],
  blockMap: Map<string, Block>,
  packageName: string | undefined,
  userLabels: unknown[]
): Field[] {
  return fields.map((field) => {
    if (fieldIsBlockType(field)) {
      const transformedBlocks = field.blocks.map((block) => {
        if (!blockMap.has(block.slug)) {
          blockMap.set(block.slug, block);
        }

        return {
          ...block,
          admin: {
            ...block.admin,
            components: {
              ...block.admin?.components,
              ...getBlockAdminComponents(block, packageName, userLabels),
            },
          },
          fields: transformFields(
            block.fields,
            blockMap,
            packageName,
            userLabels
          ),
        };
      });

      return {
        ...field,
        admin: {
          ...field.admin,
          components: {
            ...field.admin?.components,
            Field: getBlocksFieldWithPresetsPath(packageName),
          },
        },
        blocks: transformedBlocks,
      };
    }

    if (field.type === "tabs") {
      const tabsField = field as Extract<Field, { type: "tabs" }>;

      return {
        ...tabsField,
        tabs: tabsField.tabs.map((tab) => ({
          ...tab,
          fields: transformFields(
            tab.fields,
            blockMap,
            packageName,
            userLabels
          ),
        })),
      };
    }

    if (fieldHasSubFields(field)) {
      return {
        ...field,
        fields: transformFields(
          (field as { fields: Field[] }).fields,
          blockMap,
          packageName,
          userLabels
        ),
      };
    }

    return field;
  });
}

function buildEffectivePresetTypes(
  blockMap: Map<string, Block>,
  overrides: PresetType[]
): ResolvedPresetType[] {
  const overrideMap = new Map(overrides.map((o) => [o.slug, o]));

  return [...blockMap.values()].map((block) => ({
    fields: overrideMap.get(block.slug)?.fields ?? block.fields,
    label: overrideMap.get(block.slug)?.label ?? resolveBlockLabel(block),
    slug: block.slug,
  }));
}

const pluginTranslations = {
  en: {
    presetsPlugin: {
      applyPreset: {
        applyButton: "Apply Preset",
        errorApplyFailed: "Failed to apply preset structure.",
        errorInvalidPreset: "Invalid preset type.",
        errorNoData: "Preset has no data.",
        successApplied: 'Preset "{{name}}" applied.',
      },
      blocksDrawer: {
        addBlockTitle: "Add block",
        empty: "Empty",
        imagePlaceholder: "Placeholder",
        noPresetsAvailable: "No presets available",
        presetPreview: "Preset Preview",
        presets: "Presets",
        preview: "Preview",
        searchPlaceholder: "Search for a block",
        successAddedWithPreset: "Added {{blockType}} with preset: {{name}}",
      },
      deletePreset: {
        body: 'You are about to delete the preset "{{name}}". Are you sure?',
        cancel: "Cancel",
        confirm: "Delete",
        confirming: "Deleting...",
        heading: "Confirm deletion",
      },
      presetActions: {
        cancel: "Cancel",
        errorEnterName: "Enter a preset name.",
        errorFailed: "Failed to save preset",
        heading: "Save as Preset",
        presetName: "Preset name",
        replaceBlockWithPreset: "Replace this block with preset after save",
        save: "Save",
        saveButton: "Save as Preset",
        setAsPresetAfterSave: "Set as preset after save",
        successSaved: 'Preset "{{name}}" saved.',
      },
    },
  },
  es: {
    presetsPlugin: {
      applyPreset: {
        applyButton: "Aplicar Preset",
        errorApplyFailed: "Error al aplicar la estructura del preset.",
        errorInvalidPreset: "Tipo de preset inválido.",
        errorNoData: "El preset no tiene datos.",
        successApplied: 'Preset "{{name}}" aplicado.',
      },
      blocksDrawer: {
        addBlockTitle: "Añadir bloque",
        empty: "Vacío",
        imagePlaceholder: "Marcador de posición",
        noPresetsAvailable: "No hay presets disponibles",
        presetPreview: "Vista previa del preset",
        presets: "Presets",
        preview: "Vista previa",
        searchPlaceholder: "Buscar un bloque",
        successAddedWithPreset: "{{blockType}} añadido con preset: {{name}}",
      },
      deletePreset: {
        body: 'Estás a punto de eliminar el preset "{{name}}". ¿Estás seguro?',
        cancel: "Cancelar",
        confirm: "Eliminar",
        confirming: "Eliminando...",
        heading: "Confirmar eliminación",
      },
      presetActions: {
        cancel: "Cancelar",
        errorEnterName: "Introduce un nombre para el preset.",
        errorFailed: "Error al guardar el preset",
        heading: "Guardar como preset",
        presetName: "Nombre del preset",
        replaceBlockWithPreset:
          "Reemplazar este bloque por el preset tras guardar",
        save: "Guardar",
        saveButton: "Guardar como preset",
        setAsPresetAfterSave: "Usar como preset después de guardar",
        successSaved: 'Preset "{{name}}" guardado.',
      },
    },
  },
};

export const presetsPlugin =
  (config?: PresetsPluginConfig): Plugin =>
  (incomingConfig: Config): Config => {
    const {
      enabled = true,
      slug = "presets",
      presetTypes = [],
      mediaCollection = "media",
      packageName,
    } = config ?? {};

    if (!enabled) {
      return incomingConfig;
    }

    const blockMap = new Map<string, Block>();
    const userLabels: unknown[] = [];

    const transformedCollections = (incomingConfig.collections || []).map(
      (collection) => ({
        ...collection,
        fields: transformFields(
          collection.fields,
          blockMap,
          packageName,
          userLabels
        ),
      })
    );

    const transformedGlobals = (incomingConfig.globals || []).map((global) => ({
      ...global,
      fields: transformFields(global.fields, blockMap, packageName, userLabels),
    }));

    const userLabelDeps: Record<string, { path: string; type: "component" }> =
      {};
    for (const label of userLabels) {
      if (typeof label === "string") {
        userLabelDeps[`presetsUserLabel:${label}`] = {
          path: label,
          type: "component",
        };
      } else if (label && typeof label === "object") {
        const obj = label as { path?: string; exportName?: string };
        if (obj.path) {
          const key = obj.exportName
            ? `${obj.path}#${obj.exportName}`
            : obj.path;
          userLabelDeps[`presetsUserLabel:${key}`] = {
            path: key,
            type: "component",
          };
        }
      }
    }

    const effectivePresetTypes = buildEffectivePresetTypes(
      blockMap,
      presetTypes
    );

    const presetsCollection = createPresetsCollection(
      config,
      effectivePresetTypes
    );

    const clientConfig: PresetsPluginClientConfig = {
      excludeKeys: ["id", "blockType", "blockName", "experiment"],
      mediaCollection,
      presetTypes: effectivePresetTypes.map((pt) => pt.slug),
      slug: slug as CollectionSlug,
    };

    // Merge translations with English fallback for unsupported languages
    const incomingTranslations = incomingConfig.i18n?.translations as
      | Record<string, object>
      | undefined;
    const mergedTranslations: Record<string, object> = {
      ...incomingTranslations,
    };
    const supportedLanguages = Object.keys(pluginTranslations);

    for (const [lang, translations] of Object.entries(pluginTranslations)) {
      mergedTranslations[lang] = {
        ...mergedTranslations[lang],
        ...translations,
      };
    }

    for (const lang of Object.keys(mergedTranslations)) {
      if (!supportedLanguages.includes(lang)) {
        const existing = mergedTranslations[lang] as Record<string, unknown>;
        if (!existing?.presetsPlugin) {
          mergedTranslations[lang] = {
            ...existing,
            ...pluginTranslations.en,
          };
        }
      }
    }

    return {
      ...incomingConfig,
      admin: {
        ...incomingConfig.admin,
        custom: {
          ...incomingConfig.admin?.custom,
          presetsPlugin: clientConfig,
        },
        dependencies: {
          ...incomingConfig.admin?.dependencies,
          ...userLabelDeps,
        },
      },
      collections: [...transformedCollections, presetsCollection],
      globals: transformedGlobals,
      i18n: {
        ...incomingConfig.i18n,
        translations: mergedTranslations,
      },
    };
  };
