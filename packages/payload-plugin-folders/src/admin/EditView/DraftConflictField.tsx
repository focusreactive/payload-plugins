import { useDocumentInfo, useFormFields } from "@payloadcms/ui";
import type { UIFieldClientProps } from "payload";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { fetchDocument } from "../api.js";
import { useSegmentCheck } from "../Create/useSegmentCheck.js";
import { useAdminRoutes, useFoldersTranslation, useLocaleCode } from "../compat.js";
import { getSharedTreeStore } from "../store.js";
import { useApiContext } from "../useApiContext.js";
import { useConfiguredStore, useItemLocation } from "./useItemLocation.js";
import "../styles.css";

export type DraftConflictFieldProps = UIFieldClientProps & { segmentField: string };

/**
 * The page edit view's draft conflict warning (spec sections 2.6 and 7.11, build-lead decision 10).
 * A draft save passes the uniqueness rules, so two drafts can share a segment and only one can
 * publish it. This asks `check-segment`, which reads the latest versions, drafts included, and
 * warns that publishing will fail. A page already live at that segment is not warned: the other
 * page is the one that cannot publish.
 */
export const DraftConflictField = ({ segmentField }: DraftConflictFieldProps): ReactNode => {
  const { collectionSlug, docConfig, id } = useDocumentInfo();
  const { apiBaseUrl } = useAdminRoutes();
  const { translate } = useFoldersTranslation();
  const locale = useLocaleCode();
  const store = useConfiguredStore(100);
  const apiContext = useApiContext(getSharedTreeStore());
  const { location } = useItemLocation({ collection: collectionSlug ?? "", id, store });
  const segment = useFormFields(([fields]) => fields[segmentField]);
  const root = useFormFields(([fields]) => fields.isFolderRoot);
  const [liveSegment, setLiveSegment] = useState<string | null>(null);
  const hasDrafts = Boolean(
    docConfig && "versions" in docConfig && docConfig.versions && docConfig.versions.drafts
  );
  const editedSegment = typeof segment?.value === "string" ? segment.value : "";

  // The published row's segment: a page that is live at this very segment is not the one at risk.
  useEffect(() => {
    if (!hasDrafts || id === undefined || collectionSlug === undefined) {
      return undefined;
    }
    let isCurrent = true;
    const read = async () => {
      try {
        const live = await fetchDocument<Record<string, unknown> & { _status?: string }>(
          { baseUrl: apiBaseUrl },
          { collection: collectionSlug, draft: false, id, locale }
        );
        if (isCurrent) {
          setLiveSegment(live._status === "published" ? String(live[segmentField] ?? "") : null);
        }
      } catch {
        if (isCurrent) {
          setLiveSegment(null);
        }
      }
    };
    void read();

    return () => {
      isCurrent = false;
    };
  }, [apiBaseUrl, collectionSlug, hasDrafts, id, locale, segmentField]);

  const check = useSegmentCheck({
    context: apiContext,
    enabled:
      hasDrafts &&
      root?.value !== true &&
      editedSegment !== "" &&
      location !== null &&
      id !== undefined,
    exclude:
      collectionSlug === undefined || id === undefined
        ? undefined
        : { collection: collectionSlug, id },
    locale,
    parent: location?.parentId ?? null,
    segment: editedSegment,
  });

  if (check.state !== "taken" || check.conflict === undefined || liveSegment === editedSegment) {
    return null;
  }

  return (
    <div className="fr-folders-sidebar-field">
      <p className="fr-folders-warning" data-testid="draft-conflict" role="status">
        {translate(
          check.conflict.kind === "folder" ? "conflictWarningFolder" : "conflictWarningPage",
          { path: check.conflict.path }
        )}
      </p>
    </div>
  );
};
