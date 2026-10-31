"use client";

import { Button, RelationshipField, toast, useDocumentInfo, useOperation } from "@payloadcms/ui";
import type { RelationshipFieldClientProps } from "payload";
import { useCallback } from "react";
import type { ReactNode } from "react";

import type { FolderId } from "../../types.js";
import {
  Link,
  useAdminRoutes,
  useFoldersTranslation,
  useLocaleCode,
  useLocaleCount,
} from "../compat.js";
import { useMoveFlow } from "../Move/useMoveFlow.js";
import type { ResolvedTreeSettings } from "../TreeView/readTreeSettings.js";
import { getSharedTreeStore } from "../store.js";
import { useApiContext } from "../useApiContext.js";
import { readPageAsItem } from "./pageAsItem.js";
import { useConfiguredStore, useItemLocation } from "./useItemLocation.js";
import "../styles.css";

/** The link of a crumb: the tree with this folder opened and focused (P-35 turns it into a zoom). */
export const treeLinkOf = (
  adminRoute: string,
  foldersSlug: string,
  folderId: FolderId | null
): string =>
  `${adminRoute}/collections/${foldersSlug}${folderId === null ? "" : `?folder=${folderId}`}`;

export type FolderLocationFieldClientProps = RelationshipFieldClientProps & {
  segmentField: string;
  settings: ResolvedTreeSettings;
  titleField: string;
};

/**
 * The page edit view's Location field (spec section 7.11): the breadcrumb of the page's folder,
 * `Content > Blog > 2026`, each crumb a link to the tree at that folder, and a Move... button for
 * this page. It reads the location from the shared tree store, so a move made while the form is
 * open shows at once. A page that does not exist yet has no location: the stock folder picker
 * stays, so create in the edit view still chooses a folder.
 */
export const FolderLocationFieldClient = ({
  segmentField,
  settings,
  titleField,
  ...fieldProps
}: FolderLocationFieldClientProps): ReactNode => {
  const { collectionSlug, id } = useDocumentInfo();
  const operation = useOperation();
  const { adminRoute } = useAdminRoutes();
  const { translate } = useFoldersTranslation();
  const languageCount = useLocaleCount();
  const locale = useLocaleCode();
  const sharedStore = getSharedTreeStore();
  const store = useConfiguredStore(settings.pageSize);
  const { location, refresh } = useItemLocation({
    collection: collectionSlug ?? "",
    id,
    store,
  });
  const apiContext = useApiContext(sharedStore);
  const moveFlow = useMoveFlow({
    confirmMoves: settings.confirmMoves,
    enforceAllowedTypesOnMove: settings.enforceAllowedTypesOnMove,
    foldersSlug: settings.foldersSlug,
    languageCount,
    onMoved: refresh,
    onMoveFailed: refresh,
    store: sharedStore,
    translate,
    typeLabels: settings.typeLabels,
  });
  const { startMoveTo } = moveFlow;

  const openMove = useCallback(async () => {
    if (collectionSlug === undefined || id === undefined) {
      return;
    }
    try {
      startMoveTo([
        await readPageAsItem(apiContext, {
          collection: collectionSlug,
          id,
          locale,
          segmentField,
          titleField,
        }),
      ]);
    } catch {
      toast.error(translate("locationMoveFailed"));
    }
  }, [apiContext, collectionSlug, id, locale, segmentField, startMoveTo, titleField, translate]);

  if (operation === "create" || id === undefined || collectionSlug === undefined) {
    return <RelationshipField {...fieldProps} />;
  }

  return (
    <div className="fr-folders-sidebar-field" data-testid="folder-location">
      <p className="fr-folders-sidebar-field__title">{translate("locationTitle")}</p>
      {location === null ? null : (
        <nav aria-label={translate("locationTitle")}>
          <ol className="fr-folders-crumbs" data-testid="location-crumbs">
            <li>
              <Link
                data-testid="crumb-root"
                href={treeLinkOf(adminRoute, settings.foldersSlug, null)}
              >
                {translate("locationRoot")}
              </Link>
            </li>
            {location.folders.map((folder) => (
              <li key={String(folder.id)}>
                <Link
                  data-testid="crumb-folder"
                  href={treeLinkOf(adminRoute, settings.foldersSlug, folder.id)}
                >
                  {folder.name}
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div>
        <Button
          buttonStyle="secondary"
          disabled={store === null}
          extraButtonProps={{ "data-testid": "location-move" }}
          margin={false}
          onClick={() => void openMove()}
          size="medium"
        >
          {translate("locationMove")}
        </Button>
      </div>
      {moveFlow.dialogs}
    </div>
  );
};
