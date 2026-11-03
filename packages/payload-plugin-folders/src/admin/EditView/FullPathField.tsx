import { Button, toast, useDocumentInfo, useFormFields } from "@payloadcms/ui";
import type { TextFieldClientProps } from "payload";
import type { ReactNode } from "react";

import { composeFullPath } from "../../core/paths.js";
import { fetchPreviewUrl } from "../api.js";
import { useAdminRoutes, useFoldersTranslation, useLocaleCode } from "../compat.js";
import { fullPathHintOf } from "../Settings/urlHint.js";
import { useConfiguredStore, useItemLocation } from "./useItemLocation.js";
import { useLivePage } from "./useLivePage.js";
import "../styles.css";

export type FullPathFieldProps = TextFieldClientProps & {
  hasPreviewUrl: boolean;
  segmentField: string;
};

/**
 * The page edit view's Full URL (spec section 7.11): the page's path in the admin locale, a copy
 * button, and View page when the host set `admin.previewUrl`. While the segment or the root flag
 * is edited it says what the URL will change to on publish, composed in the browser from the form
 * values and the folder's path and compared with the live row, since a draft may already hold the
 * edit. A page nobody has published says where it will be published.
 */
export const FullPathField = ({
  hasPreviewUrl,
  path,
  segmentField,
}: FullPathFieldProps): ReactNode => {
  const { collectionSlug, id } = useDocumentInfo();
  const { apiBaseUrl } = useAdminRoutes();
  const { translate } = useFoldersTranslation();
  const locale = useLocaleCode();
  const store = useConfiguredStore(100);
  const { location } = useItemLocation({ collection: collectionSlug ?? "", id, store });
  const fullPath = useFormFields(([fields]) => fields[path]);
  const segment = useFormFields(([fields]) => fields[segmentField]);
  const root = useFormFields(([fields]) => fields.isFolderRoot);

  const live = useLivePage({ collection: collectionSlug, id, segmentField });

  const folderPath = location?.folderPath ?? "";
  const storedSegment = typeof segment?.initialValue === "string" ? segment.initialValue : "";
  const editedSegment = typeof segment?.value === "string" ? segment.value : "";
  const storedIsRoot = root?.initialValue === true;
  const editedIsRoot = root?.value === true;
  // After a move the form's own value is the old one, so the paths are composed from the folder the
  // store has now; the form's value stands when the folder is not known yet.
  const formPath =
    location === null
      ? null
      : composeFullPath({ folderPath, isFolderRoot: storedIsRoot, segment: storedSegment });
  // The page's URL is the live row's: the form holds the latest draft, which may be ahead of it.
  const livePath =
    location === null || !live
      ? null
      : composeFullPath({ folderPath, isFolderRoot: live.isFolderRoot, segment: live.segment });
  const shownPath =
    (live?.isPublished === true ? livePath : null) ??
    formPath ??
    (typeof fullPath?.value === "string" && fullPath.value !== "" ? fullPath.value : null);
  // Until the live row is read there is nothing to compare with; a page whose live row cannot be
  // read is compared with what the form loaded.
  const hint =
    location === null || live === undefined
      ? null
      : fullPathHintOf({
          edited: { folderPath, isFolderRoot: editedIsRoot, segment: editedSegment },
          isPublished: live === null ? true : live.isPublished,
          livePath: live === null ? formPath : livePath,
        });

  const copy = async () => {
    if (shownPath === null) {
      return;
    }
    try {
      await navigator.clipboard.writeText(shownPath);
      toast.success(translate("menuCopied", { path: shownPath }));
    } catch {
      toast.error(translate("menuCopyFailed"));
    }
  };

  const view = async () => {
    if (shownPath === null || collectionSlug === undefined) {
      return;
    }
    try {
      const { url } = await fetchPreviewUrl(
        { baseUrl: apiBaseUrl },
        { collection: collectionSlug, fullPath: shownPath, locale }
      );
      window.open(url, "_blank", "noopener");
    } catch {
      toast.error(translate("menuViewPageFailed"));
    }
  };

  if (id === undefined) {
    return null;
  }

  return (
    <div className="fr-folders-sidebar-field" data-testid="full-path-field">
      <p className="fr-folders-sidebar-field__title">{translate("settingsFullUrl")}</p>
      <code data-testid="full-path">{shownPath ?? translate("noUrl")}</code>
      {hint?.kind === "change" ? (
        <p className="fr-folders-field__hint" data-testid="url-will-change">
          {translate("fullPathWillChange", { from: hint.from, to: hint.to })}
        </p>
      ) : null}
      {hint?.kind === "publishAt" ? (
        <p className="fr-folders-field__hint" data-testid="url-will-publish">
          {translate("fullPathWillPublish", { to: hint.to })}
        </p>
      ) : null}
      <div className="fr-folders-settings__actions">
        <Button
          buttonStyle="secondary"
          disabled={shownPath === null}
          extraButtonProps={{ "data-testid": "full-path-copy" }}
          margin={false}
          onClick={() => void copy()}
          size="medium"
        >
          {translate("fullPathCopy")}
        </Button>
        {hasPreviewUrl ? (
          <Button
            buttonStyle="secondary"
            disabled={shownPath === null}
            extraButtonProps={{ "data-testid": "full-path-view" }}
            margin={false}
            onClick={() => void view()}
            size="medium"
          >
            {translate("menuViewPage")}
          </Button>
        ) : null}
      </div>
    </div>
  );
};
