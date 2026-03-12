import type { CollectionSlug } from "payload";
import type { Mode } from "../../types";

interface ModeData {
  mode: Mode;
  collectionSlug: CollectionSlug;
  documentId: number | null;
}

export function defineModeByPathname(pathname: string): ModeData {
  const createModeMatch = pathname?.match(/\/admin\/collections\/([^/]+)\/create$/);

  if (createModeMatch) {
    const collectionSlug = createModeMatch[1] as CollectionSlug;

    return {
      mode: "create",
      collectionSlug,
      documentId: null,
    };
  }

  const documentModeMatch = pathname?.match(/\/admin\/collections\/([^/]+)\/(\d+)/);

  const mode = documentModeMatch ? "document" : "global";

  const collectionSlug = (documentModeMatch?.[1] as CollectionSlug) ?? null;
  const documentId = Number(documentModeMatch?.[2]) || null;

  return {
    mode,
    collectionSlug,
    documentId,
  };
}
