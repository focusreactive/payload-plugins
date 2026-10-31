import {
  useDocumentInfo,
  useEditDepth,
  useForm,
  useFormFields,
  useFormModified,
  useHotkey,
  useOperation,
  useTranslation,
  FormSubmit,
} from "@payloadcms/ui";
import { useRef, useState } from "react";
import type { ReactNode } from "react";

import { fetchSubfolderCount, previewFolderEdit } from "../api.js";
import { useAdminRoutes, useFoldersTranslation, useLocaleCode } from "../compat.js";
import { useConfirmations } from "../Settings/useConfirmations.js";
import { useLocaleCount } from "../compat.js";

const sameTypes = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((type) => right.includes(type));

const listOf = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((type): type is string => typeof type === "string") : [];

/**
 * The Save button of the folders edit view (spec section 7.8), for a folder opened from the stock
 * list or a direct URL: the same questions as the settings drawer come first. A new URL segment
 * is previewed and confirmed with the number of URLs it changes, and locking the page types of
 * subfolders says how many subfolders it sets. Everything else saves at once, as the stock button.
 */
export const FolderSaveButton = ({ label }: { label?: string }): ReactNode => {
  const { collectionSlug, id } = useDocumentInfo();
  const { apiBaseUrl } = useAdminRoutes();
  const { submit } = useForm();
  const modified = useFormModified();
  const operation = useOperation();
  const editDepth = useEditDepth();
  const locale = useLocaleCode();
  const languageCount = useLocaleCount();
  const { translate } = useFoldersTranslation();
  const { t } = useTranslation();
  const confirmations = useConfirmations({ languageCount, translate });
  const [isChecking, setIsChecking] = useState(false);
  const buttonReference = useRef<HTMLButtonElement | null>(null);

  const slug = useFormFields(([fields]) => fields.slug);
  const name = useFormFields(([fields]) => fields.name);
  const allowedTypes = useFormFields(([fields]) => fields.allowedTypes);
  const lock = useFormFields(([fields]) => fields.lockSubfolderTypes);

  const isUpdate = operation === "update" && id !== undefined && Boolean(collectionSlug);
  const isDisabled = (operation === "update" && !modified) || isChecking;

  const save = async () => {
    if (!isUpdate || !collectionSlug || id === undefined) {
      void submit();

      return;
    }
    setIsChecking(true);
    try {
      const context = { baseUrl: apiBaseUrl };
      const folderName = typeof name?.value === "string" ? name.value : "";
      const isLocking =
        lock?.value === true &&
        (lock.initialValue !== true ||
          !sameTypes(listOf(allowedTypes?.value), listOf(allowedTypes?.initialValue)));
      if (isLocking) {
        const count = await fetchSubfolderCount(context, { foldersSlug: collectionSlug, id });
        if (
          count > 0 &&
          !(await confirmations.askAction({
            body: translate("lockConfirmBody", { count }),
            confirmLabel: translate("lockConfirmButton"),
            title: translate("lockConfirmTitle", { name: folderName }),
          }))
        ) {
          return;
        }
      }
      const segment = typeof slug?.value === "string" ? slug.value : "";
      if (segment !== "" && segment !== slug?.initialValue) {
        const preview = await previewFolderEdit(context, id, { locale, slug: segment });
        if (
          (!preview.ok || preview.urlChanges.published > 0 || preview.warnings.length > 0) &&
          !(await confirmations.askUrlChange({
            confirmingLabel: translate("renameSaving"),
            confirmLabel: translate("renameConfirmButton"),
            items: [],
            preview,
            redirectsAreAutomatic: true,
            targetTitle: folderName,
            title: translate("renameConfirmTitle", { name: folderName, segment }),
          }))
        ) {
          return;
        }
      }
      void submit();
    } catch {
      // The preview could not be read: the save is not blocked by it, and the server checks again.
      void submit();
    } finally {
      setIsChecking(false);
    }
  };

  useHotkey({ cmdCtrlKey: true, editDepth, keyCodes: ["s"] }, (event) => {
    event.preventDefault();
    event.stopPropagation();
    buttonReference.current?.click();
  });

  return (
    <>
      <FormSubmit
        buttonId="action-save"
        disabled={isDisabled}
        onClick={() => void save()}
        ref={buttonReference}
        size="medium"
        type="button"
      >
        {label || t("general:save")}
      </FormSubmit>
      {confirmations.dialogs}
    </>
  );
};
