import { CheckboxField, SelectField, useDocumentInfo, useFormFields } from "@payloadcms/ui";
import type { CheckboxFieldClientProps, SelectFieldClientProps } from "payload";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { relationIdOf } from "../../core/relationId.js";
import type { FolderId } from "../../types.js";
import { fetchDocument } from "../api.js";
import { useAdminRoutes, useFoldersTranslation, useLocaleCode } from "../compat.js";

/**
 * The folder whose lock owns this folder's page types, and the note that says so. `typesLockedBy`
 * is the plugin's own field, written by the server when a folder above locks its subfolders.
 */
const useTypeLock = (): { lockerName: string | null; lockerId: FolderId | null } => {
  const { collectionSlug } = useDocumentInfo();
  const { apiBaseUrl } = useAdminRoutes();
  const locale = useLocaleCode();
  const lockerId = relationIdOf(useFormFields(([fields]) => fields.typesLockedBy?.value));
  const [lockerName, setLockerName] = useState<string | null>(null);

  useEffect(() => {
    if (lockerId === null || !collectionSlug) {
      setLockerName(null);

      return undefined;
    }
    let isCurrent = true;
    const read = async () => {
      try {
        const folder = await fetchDocument<{ name?: string | null }>(
          { baseUrl: apiBaseUrl },
          { collection: collectionSlug, id: lockerId, locale }
        );
        if (isCurrent) {
          setLockerName(folder.name ?? null);
        }
      } catch {
        // The note then names no folder.
      }
    };
    void read();

    return () => {
      isCurrent = false;
    };
  }, [apiBaseUrl, collectionSlug, lockerId, locale]);

  return { lockerId, lockerName };
};

const LockNote = ({ lockerName }: { lockerName: string | null }): ReactNode => {
  const { translate } = useFoldersTranslation();

  return (
    <p className="fr-folders-field__hint fr-folders-lock-note" data-testid="types-locked-note">
      {lockerName === null
        ? translate("createTypesLockedUnknown")
        : translate("createTypesLocked", { title: lockerName })}
    </p>
  );
};

/**
 * The page type fields of a folder's edit view when a folder above has locked them (spec section
 * 2.3, Storyblok 3.6): the stock field, read-only, with a note saying who locked it. The server
 * already refuses an edit of a locked type; this keeps the form from offering it.
 */
export const LockableSelectField = (props: SelectFieldClientProps): ReactNode => {
  const { lockerId, lockerName } = useTypeLock();
  const isLocked = lockerId !== null;

  return (
    <>
      {/* Above the first locked field, so it reads as the heading of the locked group and not as a
          note on the Default Type field that follows the page types. */}
      {isLocked && props.path === "allowedTypes" ? <LockNote lockerName={lockerName} /> : null}
      <SelectField {...props} readOnly={props.readOnly || isLocked} />
    </>
  );
};

export const LockableCheckboxField = (props: CheckboxFieldClientProps): ReactNode => {
  const { lockerId } = useTypeLock();

  return <CheckboxField {...props} readOnly={props.readOnly || lockerId !== null} />;
};
