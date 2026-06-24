import type { ClientBlock, ClientField } from "payload";
import type { ResolvedDoc } from "../resolve/types";

export interface ExtractContext {
  getFields: (collectionSlug: string) => ClientField[];
  isUploadCollection: (slug: string) => boolean;
  slugPath: (collectionSlug: string) => string;
  blocksBySlug: Record<string, ClientBlock>;
  resolved: Map<string, ResolvedDoc>;
  baseUrl: string;
}
