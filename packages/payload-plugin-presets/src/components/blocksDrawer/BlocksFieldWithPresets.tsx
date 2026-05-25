"use client";

import { ReactNode, useCallback, useEffect, useRef } from "react";
import {
  BlocksField,
  useForm,
  useAuth,
  useDrawerSlug,
  Drawer,
  useModal,
  toast,
  useTranslation,
  useLocale,
  useFormFields,
} from "@payloadcms/ui";
import type {
  BlocksFieldClient,
  FormState,
  SanitizedFieldPermissions,
} from "payload";
import { usePresetsConfig } from "../usePresetsConfig.js";
import { buildSubFieldStateFromPreset } from "../utils.js";
import { BlockSelectorWithPresets } from "./BlockSelectorWithPresets.js";
import { useBeforeOpenDrawer } from "./BeforeOpenDrawerContext.js";
import { BlocksConfigProvider } from "./BlocksConfigContext.js";
import { OpenDrawerProvider } from "./OpenDrawerContext.js";
import type { Preset } from "../shared/index.js";
import { hydrateBlocksFieldCustomComponents } from "./clipboard.js";
import "./BlocksFieldWithPresets.scss";

type BlocksFieldWithPresetsProps = {
  field: Omit<BlocksFieldClient, "type"> &
    Partial<Pick<BlocksFieldClient, "type">>;
  path: string;
  schemaPath: string;
  indexPath: string;
  parentPath: string;
  parentSchemaPath: string;
  permissions?: SanitizedFieldPermissions;
  readOnly: boolean;
};

export const BlocksFieldWithPresets: React.FC<BlocksFieldWithPresetsProps> = (
  props,
) => {
  const { field, path, schemaPath, readOnly } = props;
  const blocks = field.blocks;

  const { excludeKeys } = usePresetsConfig();
  const { user } = useAuth();
  const locale = useLocale();
  const { t } = useTranslation();

  const { openModal, closeModal } = useModal();
  const beforeOpenDrawer = useBeforeOpenDrawer();
  const customDrawerSlug = useDrawerSlug("blocks-with-presets-drawer");
  const insertIndexRef = useRef<number | null>(null);

  const form = useForm();
  const { getData, getDataByPath, addFieldRow, replaceState, getFields } = form;
  const currentFieldState = useFormFields(([fields]) => fields?.[path]);

  const existingFieldComponentRef = useRef<ReactNode>(
    currentFieldState?.customComponents?.Field,
  );

  useEffect(() => {
    if (currentFieldState?.customComponents?.Field) {
      existingFieldComponentRef.current =
        currentFieldState.customComponents.Field;
    }
  }, [currentFieldState?.customComponents]);

  const wrappedReplaceState = useCallback(
    (incomingState: FormState) => {
      if (!existingFieldComponentRef.current) {
        replaceState(incomingState);
        return;
      }

      const snapshot = getFields();
      const rehydrated: FormState = {};
      for (const key in incomingState) {
        if (key.startsWith(path) && !incomingState[key].customComponents) {
          const existing = snapshot[key]?.customComponents;
          rehydrated[key] = existing
            ? { ...incomingState[key], customComponents: existing }
            : incomingState[key];
        } else {
          rehydrated[key] = incomingState[key];
        }
      }

      const nextState = hydrateBlocksFieldCustomComponents({
        blocks,
        currentFieldState,
        existingFieldComponent: existingFieldComponentRef.current,
        path,
        state: rehydrated,
      });

      replaceState(nextState);
    },
    [blocks, currentFieldState, path, replaceState, getFields],
  );

  form.replaceState = wrappedReplaceState;

  const fullData = getData() as {
    tenant?: number;
    [key: string]: unknown;
  } | null;
  const tenantId = fullData?.tenant ?? user?.tenant?.id ?? user?.tenant;

  const blocksData = (getDataByPath<unknown[]>(path) || []) as unknown[];
  const addRowIndex = blocksData.length;

  const handleBlockSelect = (blockType: string, preset?: Preset | null) => {
    const targetRowIndex = insertIndexRef.current ?? addRowIndex;

    if (preset) {
      const presetBlocks = preset.presetBlock;
      const presetData = presetBlocks?.[0];

      if (presetData) {
        const subFieldState = buildSubFieldStateFromPreset(
          presetData,
          excludeKeys,
        );

        addFieldRow({
          path,
          rowIndex: targetRowIndex,
          schemaPath,
          blockType,
          subFieldState: subFieldState as FormState,
        });

        toast.success(
          t("presetsPlugin:blocksDrawer:successAddedWithPreset" as never, {
            blockType,
            name: preset.name,
          }),
        );
      } else {
        addFieldRow({ path, rowIndex: targetRowIndex, schemaPath, blockType });
      }
    } else {
      addFieldRow({ path, rowIndex: targetRowIndex, schemaPath, blockType });
    }

    insertIndexRef.current = null;
    closeModal(customDrawerSlug);
  };

  const handleOpenDrawer = async (insertIndex: number | null = null) => {
    if (beforeOpenDrawer) {
      const allowed = await beforeOpenDrawer({
        field,
        path,
        schemaPath,
        readOnly,
        permissions: props.permissions,
        blocksData,
        formData: fullData ?? {},
      });
      if (!allowed) return;
    }

    insertIndexRef.current = insertIndex;
    openModal(customDrawerSlug);
  };

  return (
    <BlocksConfigProvider value={blocks}>
      <OpenDrawerProvider
        openDrawer={(insertIndex) => {
          void handleOpenDrawer(insertIndex);
        }}
      >
        <div className="blocks-field-with-presets">
          <BlocksField {...props} />

          {!readOnly && (
            <div className="blocks-field-with-presets__footer-actions">
              <button
                className="blocks-field__drawer-toggler blocks-field-with-presets__drawer-toggler"
                type="button"
                onClick={() => handleOpenDrawer()}
              >
                <span
                  aria-disabled="false"
                  className="btn btn--icon btn--icon-style-with-border btn--size-medium btn--icon-position-left btn--withoutPopup btn--style-icon-label btn--withoutPopup"
                >
                  <span className="btn__content">
                    <span className="btn__label">
                      {t("presetsPlugin:blocksDrawer:addBlockTitle" as never)}
                    </span>
                    <span className="btn__icon">
                      <svg
                        className="icon icon--plus"
                        height="20"
                        viewBox="0 0 20 20"
                        width="20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          className="stroke"
                          d="M5.33333 9.99998H14.6667M9.99999 5.33331V14.6666"
                          strokeLinecap="square"
                        ></path>
                      </svg>
                    </span>
                  </span>
                </span>
              </button>
            </div>
          )}

          <Drawer
            slug={customDrawerSlug}
            title={t("presetsPlugin:blocksDrawer:addBlockTitle" as never)}
          >
            <BlockSelectorWithPresets
              blocks={blocks}
              onSelect={handleBlockSelect}
              tenantId={tenantId}
              locale={locale?.code}
            />
          </Drawer>
        </div>
      </OpenDrawerProvider>
    </BlocksConfigProvider>
  );
};
