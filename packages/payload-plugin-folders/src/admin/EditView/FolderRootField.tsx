import {
  CheckboxInput,
  useDocumentInfo,
  useField,
  useForm,
  useFormFields,
  useModal,
} from "@payloadcms/ui";
import type { CheckboxFieldClientProps } from "payload";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

import { useDialogSlug } from "../dialogScope.js";
import { useAdminRoutes, useFoldersTranslation, useLocaleCode } from "../compat.js";
import { UnrootDialog, unrootDialogSlug } from "../Settings/UnrootDialog.js";
import type { UnrootRequest } from "../Settings/UnrootDialog.js";
import { useConfiguredStore, useItemLocation } from "./useItemLocation.js";
import { useRootClash } from "./useRootClash.js";
import "../styles.css";

/** Marks the segment field a root page greys out: the page's own segment is not part of its URL. */
const greyedAttribute = "data-fr-folders-greyed";

/**
 * Greys out the host's segment field while the page is a root page (Storyblok 2.2). The field is the
 * host's own, so it is found by the id Payload gives its input and the whole field is made inert:
 * it cannot be focused or typed in, and the page's stored segment stays as it was until the page is
 * un-rooted.
 */
const useGreyedSegmentField = (segmentField: string, isGreyed: boolean): void => {
  useEffect(() => {
    const input = document.querySelector(`[id="field-${segmentField.replaceAll(".", "__")}"]`);
    const element = input?.closest(".field-type") ?? input;
    if (!element || !isGreyed) {
      return undefined;
    }
    element.setAttribute("inert", "");
    element.setAttribute(greyedAttribute, "true");

    return () => {
      element.removeAttribute("inert");
      element.removeAttribute(greyedAttribute);
    };
  }, [isGreyed, segmentField]);
};

export type FolderRootFieldProps = CheckboxFieldClientProps & {
  segmentField: string;
  titleField: string;
};

/**
 * The page edit view's Folder root page checkbox (spec sections 4 and 7.11) with Storyblok's
 * tooltip text. Ticking greys the segment field and shows the folder path the page then has;
 * unticking never just unticks, it always opens the dialog that asks for the page's own segment,
 * pre-filled with the stored one. The choice goes into the form, so the stock Save or Publish
 * applies it like any other edit.
 */
export const FolderRootField = ({
  path,
  readOnly,
  segmentField,
  titleField,
}: FolderRootFieldProps): ReactNode => {
  const { collectionSlug, id } = useDocumentInfo();
  const { apiBaseUrl } = useAdminRoutes();
  const { translate } = useFoldersTranslation();
  const locale = useLocaleCode();
  const { openModal } = useModal();
  const unrootSlug = useDialogSlug(unrootDialogSlug);
  const { dispatchFields, setModified } = useForm();
  const { errorMessage, setValue, showError, value } = useField<boolean>({ path });
  const segment = useFormFields(([fields]) => fields[segmentField]);
  const title = useFormFields(([fields]) => fields[titleField]);
  const store = useConfiguredStore(100);
  const { location } = useItemLocation({ collection: collectionSlug ?? "", id, store });
  // A new object on every render would restart the dialog's lookup of its starting segment.
  const apiContext = useMemo(() => ({ baseUrl: apiBaseUrl }), [apiBaseUrl]);
  const [request, setRequest] = useState<UnrootRequest | null>(null);
  const sessions = useRef(0);
  const isRoot = Boolean(value);

  // Another page that is already the folder's root page keeps this one from taking the place.
  const rootClash = useRootClash({
    collection: collectionSlug,
    enabled: location !== null && id !== undefined,
    id,
    parent: location?.parentId ?? null,
  });
  const isTaken = !isRoot && rootClash !== null;
  // Unticking asks for the folder the page is in, which is not known until the location loads.
  const isLocating = isRoot && id !== undefined && location === null;

  useGreyedSegmentField(segmentField, isRoot);

  const toggle = () => {
    if (!isRoot) {
      if (!isTaken) {
        setValue(true);
      }

      return;
    }
    if (isLocating) {
      return;
    }
    if (collectionSlug === undefined || id === undefined) {
      setValue(false);

      return;
    }
    sessions.current += 1;
    setRequest({
      collection: collectionSlug,
      folderId: location?.parentId ?? null,
      folderPath: location?.folderPath ?? "/",
      id,
      locale,
      session: sessions.current,
      storedSlug:
        typeof segment?.initialValue === "string"
          ? segment.initialValue
          : typeof segment?.value === "string"
            ? segment.value
            : null,
      title: typeof title?.value === "string" ? title.value : "",
      willGoLive: null,
    });
    openModal(unrootSlug);
  };

  return (
    <div className="fr-folders-sidebar-field" data-testid="folder-root-field">
      <div title={translate("rootFieldTooltip")}>
        <CheckboxInput
          checked={isRoot}
          id={`field-${path}`}
          label={translate("createRootPage")}
          onToggle={toggle}
          readOnly={readOnly || isTaken || isLocating}
        />
      </div>
      {isTaken ? (
        <p className="fr-folders-field__hint" data-testid="root-taken">
          {translate("menuRootTaken", { title: rootClash.title })}
        </p>
      ) : null}
      {showError && errorMessage ? (
        <p className="fr-folders-error" data-testid="root-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
      <p className="fr-folders-field__hint" data-testid="root-tooltip">
        {translate("rootFieldTooltip")}
      </p>
      {isRoot ? (
        <p className="fr-folders-field__hint" data-testid="root-path">
          {translate("settingsRootUrl", { path: location?.folderPath ?? "/" })}
        </p>
      ) : null}
      <UnrootDialog
        apiContext={apiContext}
        onConfirm={(chosen) => {
          // The box first and the segment last: Payload keeps the client's value of the field
          // edited last when the server's form state comes back, and a segment that is not that
          // field would be put back to the stored one.
          setValue(false);
          dispatchFields({ path: segmentField, type: "UPDATE", value: chosen });
          setModified(true);
        }}
        request={request}
        translate={translate}
      />
    </div>
  );
};
