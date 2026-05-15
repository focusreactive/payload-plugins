import type { CollectionConfig, Field, Where } from "payload";

import {
  AB_PASS_PERCENTAGE_FIELD,
  AB_VARIANT_OF_FIELD,
  AB_VARIANT_PERCENTAGES_FIELD,
  DEFAULT_SLUG_FIELD,
} from "../constants";
import type { CollectionABConfig } from "../types/config";

const VARIANTS_FIELD_PATH =
  "@focus-reactive/payload-plugin-ab/admin/VariantsField#VariantsField";

function isVariant(data: Record<string, unknown>): boolean {
  return Boolean(data[AB_VARIANT_OF_FIELD]);
}

/** Patch a top-level field to be hidden on variant documents. */
function hideOnVariant(field: Field): Field {
  return {
    ...field,
    admin: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(field as any).admin,
      condition: (data: Record<string, unknown>) => !isVariant(data),
    },
  } as Field;
}

/** Find a top-level field by name and patch it. Returns the new fields array. */
function patchField(
  fields: Field[],
  name: string,
  patcher: (f: Field) => Field
): Field[] {
  return fields.map((f) => {
    if ("name" in f && f.name === name) {return patcher(f);}
    return f;
  });
}

export function injectAdminFields<TVariantData extends object>(
  collection: CollectionConfig,
  collectionSlug: string,
  abConfig: CollectionABConfig<TVariantData>
): CollectionConfig {
  const slugField = abConfig.slugField ?? DEFAULT_SLUG_FIELD;

  // 1. _abVariantOf — native relationship field in sidebar, read-only, visible on variant pages only.
  //    Payload renders this natively: shows the parent page title with a link.
  const variantOfField: Field = {
    admin: {
      condition: (data: Record<string, unknown>) => isVariant(data),
      description: "The original page this variant belongs to.",
      position: "sidebar",
      readOnly: true,
    },
    label: "Variant of",
    name: AB_VARIANT_OF_FIELD,
    relationTo: collectionSlug as CollectionConfig["slug"],
    type: "relationship",
  };

  // 2. _abPassPercentage — hidden everywhere; managed inline in the Variants panel.
  const passPercentageField: Field = {
    admin: {
      hidden: true,
    },
    max: 99,
    min: 1,
    name: AB_PASS_PERCENTAGE_FIELD,
    type: "number",
  };

  // 3. _abVariants — Variants panel UI field in sidebar, visible on original pages only.
  const variantsUiField: Field = {
    admin: {
      components: {
        Field: VARIANTS_FIELD_PATH,
      },
      condition: (data: Record<string, unknown>) => !isVariant(data),
      position: "sidebar",
    },
    name: "_abVariants",
    type: "ui",
  };

  // 5. _abVariantPercentages — hidden JSON buffer on original documents only.
  //    Stores { [variantId]: percentage } pending changes until parent is saved.
  //    The afterChange hook reads this and applies values to variant docs.
  const variantPercentagesField: Field = {
    admin: {
      condition: (data: Record<string, unknown>) => !isVariant(data),
      hidden: true,
    },
    name: AB_VARIANT_PERCENTAGES_FIELD,
    type: "json",
  };

  // 4. Hide slug on variant pages (auto-generated slug must not be changed manually).
  let patchedFields = patchField(
    collection.fields ?? [],
    slugField,
    hideOnVariant
  );

  // 5. Hide tenantField on variant pages (must match parent — not editable on variants).
  if (abConfig.tenantField) {
    const topLevelTenantFieldName = abConfig.tenantField.split(".")[0]!;
    patchedFields = patchField(
      patchedFields,
      topLevelTenantFieldName,
      hideOnVariant
    );
  }

  // 6. Assemble: pass percentage first (hidden), then user fields, then sidebar UI last.
  const newFields: Field[] = [
    passPercentageField,
    ...patchedFields,
    variantOfField,
    variantPercentagesField,
    variantsUiField,
  ];

  // 7. Patch admin.baseListFilter to exclude variant docs from the collection list view.
  const existingBaseListFilter = collection.admin?.baseListFilter;
  const newBaseListFilter = existingBaseListFilter
    ? async (
        ...args: Parameters<NonNullable<typeof existingBaseListFilter>>
      ): Promise<Where> => {
        const existing = await existingBaseListFilter(...args);
        return {
          and: [existing ?? {}, { [AB_VARIANT_OF_FIELD]: { exists: false } }],
        };
      }
    : (): Where => ({ [AB_VARIANT_OF_FIELD]: { exists: false } });

  return {
    ...collection,
    admin: {
      ...collection.admin,
      baseListFilter: newBaseListFilter,
    },
    fields: newFields,
  };
}
