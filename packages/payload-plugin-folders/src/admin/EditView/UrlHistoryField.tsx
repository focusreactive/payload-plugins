import { useDocumentInfo } from "@payloadcms/ui";
import type { UIFieldClientProps } from "payload";
import type { ReactNode } from "react";

import { useAdminRoutes, useFoldersTranslation } from "../compat.js";
import { UrlHistoryList } from "../Settings/UrlHistoryList.js";
import "../styles.css";

/**
 * The page edit view's URL history (spec section 7.11): the `folder-redirects` rows that target
 * this page, collapsed, with the dates the old paths started redirecting.
 */
export const UrlHistoryField = (_props: UIFieldClientProps): ReactNode => {
  const { collectionSlug, id } = useDocumentInfo();
  const { apiBaseUrl } = useAdminRoutes();
  const { language, translate } = useFoldersTranslation();

  if (id === undefined || collectionSlug === undefined) {
    return null;
  }

  return (
    <div className="fr-folders-sidebar-field">
      <UrlHistoryList
        apiContext={{ baseUrl: apiBaseUrl }}
        collection={collectionSlug}
        id={id}
        language={language}
        translate={translate}
      />
    </div>
  );
};
