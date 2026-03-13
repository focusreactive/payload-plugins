import type { CollectionSlug } from "payload";
import type { Mode } from "../../types";
import { EXCLUDED_ADMIN_ROUTES } from "../../constants";

interface ModeData {
  mode: Mode;
  collectionSlug: CollectionSlug | null;
  documentId: number | null;
}

export function defineModeByPathname(pathname: string): ModeData {
  // 1. Excluded admin routes — return global immediately
  if (EXCLUDED_ADMIN_ROUTES.some((route) => pathname?.startsWith(route))) {
    return { mode: 'global', collectionSlug: null, documentId: null }
  }

  // 2. Document mode — /admin/collections/{slug}/{numericId}
  const documentModeMatch = pathname?.match(/\/admin\/collections\/([^/]+)\/(\d+)/)
  if (documentModeMatch) {
    return {
      mode: 'document',
      collectionSlug: documentModeMatch[1] as CollectionSlug,
      documentId: Number(documentModeMatch[2]),
    }
  }

  // 3. Global fallback (includes /create pages)
  return { mode: 'global', collectionSlug: null, documentId: null }
}
