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

  // For npm package: 'package-name/client#Component'
  return `${resolvedName}/client#${componentName}`;
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
  resolvedPresetTypes: ResolvedPresetType[],
): CollectionConfig<"presets"> => {
  const {
    overrides = {},
    slug = "presets",
    labels = {
      singular: { en: "Preset", es: "Preset" },
      plural: { en: "Presets", es: "Presets" },
    },
    packageName,
    mediaCollection = "media",
  } = config ?? {};

  const previewFieldPath = getPluginComponentPath(
    packageName,
    "components/PresetAdminComponentPreview",
    "PresetAdminComponentPreview",
  );

  const previewCellPath = getPluginComponentPath(
    packageName,
    "components/PresetAdminComponentCell",
    "PresetAdminComponentCell",
  );

  const typeOptions = resolvedPresetTypes.map(({ slug: typeSlug, label }) => ({
    value: typeSlug,
    label,
  }));

  const presetTypeGroupFields: Field[] = resolvedPresetTypes.map(
    ({ slug: typeSlug, label, fields }) => ({
      name: typeSlug,
      type: "group" as const,
      label,
      admin: {
        condition: (_: unknown, siblingData: { type?: string }) =>
          siblingData?.type === typeSlug,
      },
      fields,
    }),
  );

  const defaultFields: Field[] = [
    {
      name: "previewDisplay",
      label: { en: "Preview", es: "Vista previa" },
      type: "ui",
      admin: {
        position: "sidebar",
        components: {
          Field: previewFieldPath,
        },
      },
    },
    {
      name: "name",
      type: "text",
      required: true,
      label: { en: "Preset Name", es: "Nombre del Preset" },
      localized: true,
    },
    {
      name: "preview",
      type: "upload",
      relationTo: mediaCollection as CollectionSlug,
      admin: {
        description: {
          en: "The preview image for the preset",
          es: "La imagen de vista previa para el preset",
        },
        components: {
          Cell: previewCellPath,
        },
      },
    },
    {
      name: "type",
      type: "select",
      required: true,
      options: typeOptions,
      label: { en: "Preset Type", es: "Tipo de Preset" },
      admin: {
        description: {
          en: "Choose type — only the matching section below will be shown.",
          es: "Elige tipo — solo se mostrará la sección correspondiente.",
        },
      },
    },
    ...presetTypeGroupFields,
  ];

  const finalFields = overrides.fields
    ? overrides.fields(defaultFields)
    : defaultFields;

  return {
    slug,
    labels,
    access: overrides.access || {},
    admin: {
      useAsTitle: "name",
      defaultColumns: ["name", "preview", "type", "updatedAt"],
      group: "Collections",
      description: {
        en: "One preset = one type. After choosing type, fill the matching section below.",
        es: "Un preset = un tipo. Tras elegir tipo, rellena la sección correspondiente.",
      },
      hidden: false,
      ...overrides.admin,
    },
    fields: finalFields,
    timestamps: true,
    hooks: overrides.hooks || {},
  };
};

function getBlocksFieldWithPresetsPath(packageName?: string): string {
  return getPluginComponentPath(
    packageName,
    "components/blocksDrawer/BlocksFieldWithPresets",
    "BlocksFieldWithPresets",
  );
}

export function getBlockAdminComponents(
  packageName?: string,
): NonNullable<Block["admin"]>["components"] {
  return {
    Label: getPluginComponentPath(
      packageName,
      "components/presetActions/BlockLabelWithPresets",
      "BlockLabelWithPresets",
    ),
  };
}

function resolveBlockLabel(block: Block): StaticLabel {
  const singular = block.labels?.singular;

  if (!singular || typeof singular === "function") return block.slug;

  return singular;
}

function fieldIsBlockType(
  field: Field,
): field is Extract<Field, { type: "blocks" }> {
  return field.type === "blocks";
}

function fieldHasSubFields(
  field: Field,
): field is Extract<Field, { fields: Field[] }> {
  return (
    "fields" in field && Array.isArray((field as { fields?: unknown }).fields)
  );
}

function transformFields(
  fields: Field[],
  blockMap: Map<string, Block>,
  packageName: string | undefined,
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
              ...getBlockAdminComponents(),
            },
          },
          fields: transformFields(block.fields, blockMap, packageName),
        };
      });

      return {
        ...field,
        blocks: transformedBlocks,
        admin: {
          ...field.admin,
          components: {
            ...field.admin?.components,
            Field: getBlocksFieldWithPresetsPath(packageName),
          },
        },
      };
    }

    if (field.type === "tabs") {
      const tabsField = field as Extract<Field, { type: "tabs" }>;

      return {
        ...tabsField,
        tabs: tabsField.tabs.map((tab) => ({
          ...tab,
          fields: transformFields(tab.fields, blockMap, packageName),
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
        ),
      };
    }

    return field;
  });
}

function buildEffectivePresetTypes(
  blockMap: Map<string, Block>,
  overrides: PresetType[],
): ResolvedPresetType[] {
  const overrideMap = new Map(overrides.map((o) => [o.slug, o]));

  return Array.from(blockMap.values()).map((block) => ({
    slug: block.slug,
    label: overrideMap.get(block.slug)?.label ?? resolveBlockLabel(block),
    fields: overrideMap.get(block.slug)?.fields ?? block.fields,
  }));
}

const pluginTranslations = {
  en: {
    presetsPlugin: {
      presetActions: {
        heading: "Save as Preset",
        presetName: "Preset name",
        setAsPresetAfterSave: "Set as preset after save",
        replaceBlockWithPreset: "Replace this block with preset after save",
        save: "Save",
        cancel: "Cancel",
        saveButton: "Save as Preset",
        errorEnterName: "Enter a preset name.",
        successSaved: 'Preset "{{name}}" saved.',
        errorFailed: "Failed to save preset",
      },
      applyPreset: {
        applyButton: "Apply Preset",
        errorInvalidPreset: "Invalid preset type.",
        errorNoData: "Preset has no data.",
        successApplied: 'Preset "{{name}}" applied.',
        errorApplyFailed: "Failed to apply preset structure.",
      },
      blocksDrawer: {
        noPresetsAvailable: "No presets available",
        addBlockTitle: "Add block",
        empty: "Empty",
        preview: "Preview",
        searchPlaceholder: "Search for a block",
        imagePlaceholder: "Placeholder",
        presetPreview: "Preset Preview",
        successAddedWithPreset: "Added {{blockType}} with preset: {{name}}",
      },
      deletePreset: {
        heading: "Confirm deletion",
        body: 'You are about to delete the preset "{{name}}". Are you sure?',
        confirm: "Delete",
        confirming: "Deleting...",
        cancel: "Cancel",
      },
    },
  },
  es: {
    presetsPlugin: {
      presetActions: {
        heading: "Guardar como preset",
        presetName: "Nombre del preset",
        setAsPresetAfterSave: "Usar como preset después de guardar",
        replaceBlockWithPreset:
          "Reemplazar este bloque por el preset tras guardar",
        save: "Guardar",
        cancel: "Cancelar",
        saveButton: "Guardar como preset",
        errorEnterName: "Introduce un nombre para el preset.",
        successSaved: 'Preset "{{name}}" guardado.',
        errorFailed: "Error al guardar el preset",
      },
      applyPreset: {
        applyButton: "Aplicar Preset",
        errorInvalidPreset: "Tipo de preset inválido.",
        errorNoData: "El preset no tiene datos.",
        successApplied: 'Preset "{{name}}" aplicado.',
        errorApplyFailed: "Error al aplicar la estructura del preset.",
      },
      blocksDrawer: {
        noPresetsAvailable: "No hay presets disponibles",
        addBlockTitle: "Añadir bloque",
        empty: "Vacío",
        preview: "Vista previa",
        searchPlaceholder: "Buscar un bloque",
        imagePlaceholder: "Marcador de posición",
        presetPreview: "Vista previa del preset",
        successAddedWithPreset: "{{blockType}} añadido con preset: {{name}}",
      },
      deletePreset: {
        heading: "Confirmar eliminación",
        body: 'Estás a punto de eliminar el preset "{{name}}". ¿Estás seguro?',
        confirm: "Eliminar",
        confirming: "Eliminando...",
        cancel: "Cancelar",
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

    const transformedCollections = (incomingConfig.collections || []).map(
      (collection) => ({
        ...collection,
        fields: transformFields(collection.fields, blockMap, packageName),
      }),
    );

    const transformedGlobals = (incomingConfig.globals || []).map((global) => ({
      ...global,
      fields: transformFields(global.fields, blockMap, packageName),
    }));

    const effectivePresetTypes = buildEffectivePresetTypes(
      blockMap,
      presetTypes,
    );

    const presetsCollection = createPresetsCollection(
      config,
      effectivePresetTypes,
    );

    const clientConfig: PresetsPluginClientConfig = {
      slug: slug as CollectionSlug,
      presetTypes: effectivePresetTypes.map((pt) => pt.slug),
      excludeKeys: ["id", "blockType", "blockName", "experiment"],
      mediaCollection,
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
        ...(mergedTranslations[lang] || {}),
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
      },
      i18n: {
        ...incomingConfig.i18n,
        translations: mergedTranslations,
      },
      collections: [...transformedCollections, presetsCollection],
      globals: transformedGlobals,
    };
  };
