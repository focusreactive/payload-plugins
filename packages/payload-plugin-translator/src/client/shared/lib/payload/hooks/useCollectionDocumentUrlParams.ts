import { useParams } from "next/navigation";
import type { CollectionSlug } from "payload";

type CollectionItemId = string;
interface UseCollectionUrlParamsReturn {
  collection: CollectionSlug;
  id: CollectionItemId;
}

export function useCollectionDocumentUrlParams(): UseCollectionUrlParamsReturn {
  const params = useParams<{
    segments?: [string, CollectionSlug, CollectionItemId];
  }>();
  const {segments} = params;
  if (!segments) {
    throw new Error(
      "useCollectionUrlParams hook can only be called on collection pages. Make sure you are using this hook within a Payload collection context."
    );
  }

  return { collection: segments[1], id: segments[2] };
}
