import type { CollectionSlug } from "payload";

import { EXCLUDED_ADMIN_ROUTES } from "../../constants";
import type { Mode } from "../../types";

interface ModeData {
  mode: Mode;
  collectionSlug: CollectionSlug | null;
  documentId: number | null;
  globalSlug: string | null;
}

export function defineModeByPathname(pathname: string): ModeData {
  if (EXCLUDED_ADMIN_ROUTES.some((route) => pathname?.startsWith(route))) {
    return {
      collectionSlug: null,
      documentId: null,
      globalSlug: null,
      mode: "global",
    };
  }

  const documentModeMatch = pathname?.match(
    /\/admin\/collections\/([^/]+)\/(\d+)/
  );
  if (documentModeMatch) {
    return {
      collectionSlug: documentModeMatch[1] as CollectionSlug,
      documentId: Number(documentModeMatch[2]),
      globalSlug: null,
      mode: "document",
    };
  }

  const globalDocumentMatch = pathname?.match(/\/admin\/globals\/([^/]+)$/);
  if (globalDocumentMatch) {
    return {
      collectionSlug: null,
      documentId: null,
      globalSlug: globalDocumentMatch[1] ?? null,
      mode: "global-document",
    };
  }

  return {
    collectionSlug: null,
    documentId: null,
    globalSlug: null,
    mode: "global",
  };
}
