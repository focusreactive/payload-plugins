import {
  DATA_VE_COLLECTION_ATTR,
  DATA_VE_DOC_ID_ATTR,
  DATA_VE_KIND_ATTR,
  DATA_VE_PATH_ATTR,
} from "../constants.js";
import { isMetaInfo } from "../internal/shared.js";

type Attrs = Partial<{
  [DATA_VE_PATH_ATTR]: string;
  [DATA_VE_DOC_ID_ATTR]: string;
  [DATA_VE_COLLECTION_ATTR]: string;
  [DATA_VE_KIND_ATTR]: string;
}>;

export const withVisualEditingPath = (value: unknown): Attrs => {
  const hasMeta = !!value && typeof value === "object" && "_meta" in value;
  if (!(hasMeta && isMetaInfo(value._meta))) return {};

  const meta = value._meta;
  return {
    [DATA_VE_PATH_ATTR]: meta.path,
    [DATA_VE_COLLECTION_ATTR]: meta.collectionSlug,
    [DATA_VE_KIND_ATTR]: meta.kind,
    ...(meta.docId !== undefined && { [DATA_VE_DOC_ID_ATTR]: meta.docId }),
  };
};
