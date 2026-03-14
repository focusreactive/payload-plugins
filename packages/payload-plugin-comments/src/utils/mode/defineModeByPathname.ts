import type { CollectionSlug } from "payload";
import type { Mode } from "../../types";
import { EXCLUDED_ADMIN_ROUTES } from "../../constants";

interface ModeData {
  mode: Mode;
  collectionSlug: CollectionSlug | null;
  documentId: number | null;
  globalSlug: string | null;
}

export function defineModeByPathname(pathname: string): ModeData {
  if (EXCLUDED_ADMIN_ROUTES.some((route) => pathname?.startsWith(route))) {
    return {
      mode: "global",
      collectionSlug: null,
      documentId: null,
      globalSlug: null,
    };
  }

  const documentModeMatch = pathname?.match(/\/admin\/collections\/([^/]+)\/(\d+)/);
  if (documentModeMatch) {
    return {
      mode: "document",
      collectionSlug: documentModeMatch[1] as CollectionSlug,
      documentId: Number(documentModeMatch[2]),
      globalSlug: null,
    };
  }

  const globalDocumentMatch = pathname?.match(/\/admin\/globals\/([^/]+)$/);
  if (globalDocumentMatch) {
    return {
      mode: "global-document",
      globalSlug: globalDocumentMatch[1] ?? null,
      collectionSlug: null,
      documentId: null,
    };
  }

  return {
    mode: "global",
    collectionSlug: null,
    documentId: null,
    globalSlug: null,
  };
}
