import { useDocumentInfo, useFormFields } from "@payloadcms/ui";
import type { UIFieldClientProps } from "payload";
import type { ReactNode } from "react";

import { useSegmentCheck } from "../Create/useSegmentCheck.js";
import { useFoldersTranslation, useLocaleCode } from "../compat.js";
import { getSharedTreeStore } from "../store.js";
import { useApiContext } from "../useApiContext.js";
import { useConfiguredStore, useItemLocation } from "./useItemLocation.js";
import { useLivePage } from "./useLivePage.js";
import { useRootClash } from "./useRootClash.js";
import "../styles.css";
import { toText } from "../../core/text.js";

export type DraftConflictFieldProps = UIFieldClientProps & { segmentField: string };

/**
 * The page edit view's draft conflict warnings (spec sections 2.6 and 7.11, build-lead decision
 * 10). A draft save passes the uniqueness rules, so two drafts can share a segment, or both claim
 * the folder's root page, and only one can publish. A page that is not the root page asks
 * `check-segment` and one that is asks `check-root`; both read the latest versions, drafts
 * included, and warn that publishing will fail. A page already live at that segment is not warned:
 * the other page is the one that cannot publish.
 */
export const DraftConflictField = ({ segmentField }: DraftConflictFieldProps): ReactNode => {
  const { collectionSlug, docConfig, id } = useDocumentInfo();
  const { translate } = useFoldersTranslation();
  const locale = useLocaleCode();
  const store = useConfiguredStore(100);
  const apiContext = useApiContext(getSharedTreeStore());
  const { location } = useItemLocation({ collection: collectionSlug ?? "", id, store });
  const segment = useFormFields(([fields]) => fields[segmentField]);
  const root = useFormFields(([fields]) => fields.isFolderRoot);
  const live = useLivePage({ collection: collectionSlug, id, segmentField });
  const hasDrafts = Boolean(
    docConfig && "versions" in docConfig && docConfig.versions && docConfig.versions.drafts
  );
  const editedSegment = toText(segment?.value);
  const isRoot = root?.value === true;
  const parent = location?.parentId ?? null;

  const check = useSegmentCheck({
    context: apiContext,
    enabled: hasDrafts && !isRoot && editedSegment !== "" && location !== null && id !== undefined,
    exclude:
      collectionSlug === undefined || id === undefined
        ? undefined
        : { collection: collectionSlug, id },
    locale,
    parent,
    segment: editedSegment,
  });
  const rootClash = useRootClash({
    collection: collectionSlug,
    enabled: hasDrafts && isRoot && location !== null && id !== undefined,
    id,
    parent,
  });

  if (rootClash !== null) {
    return (
      <div className="fr-folders-sidebar-field">
        <p className="fr-folders-warning" data-testid="draft-root-conflict" role="status">
          {translate("conflictWarningRoot", { path: rootClash.path, title: rootClash.title })}
        </p>
      </div>
    );
  }
  // The page that is live at this very segment is not the one at risk.
  const liveSegment = live?.isPublished === true && !live.isFolderRoot ? live.segment : null;
  if (
    isRoot ||
    check.state !== "taken" ||
    check.conflict === undefined ||
    liveSegment === editedSegment
  ) {
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
