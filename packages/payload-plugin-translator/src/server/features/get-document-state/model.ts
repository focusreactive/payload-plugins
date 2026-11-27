import { z } from "zod";
import type { CollectionSlug } from "payload";

import { DocumentIdSchema } from "../../shared/index.js";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap.js";
import type { SourceFingerprinter } from "../../../core/domain/content-projection/sourceFingerprinter.js";
import type { ProvenanceAccess } from "../../modules/plugin-config/index.js";
import type { TranslatableTextPresence } from "../../../core/domain/content-projection/holdsTranslatableText.js";

export const GetDocumentStateInputSchema = z.object({
  collection_id: DocumentIdSchema,
  collection_slug: z.string().nonempty(),
});

export type GetDocumentStateConfig = {
  availableCollections: Set<CollectionSlug>;
  schemaMap: CollectionSchemaMap;
  fingerprintOf: SourceFingerprinter;
  holdsText: TranslatableTextPresence;
  provenance?: ProvenanceAccess;
};
