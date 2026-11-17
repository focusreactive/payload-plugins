import {
  DATA_VE_COLLECTION_ATTR,
  DATA_VE_DOC_ID_ATTR,
  DATA_VE_KEY_ATTR,
  DATA_VE_KIND_ATTR,
  DATA_VE_LOCALE_ATTR,
  DATA_VE_PATH_ATTR,
} from "../shared/protocol.js";
import type { VeIdentity } from "../shared/shared.js";

import { isMetaInfo, META_KEY, veIdentityOf } from "../shared/shared.js";
import { isPlainObject } from "../shared/plainObject.js";

type Attrs = Partial<{
  [DATA_VE_PATH_ATTR]: string;
  [DATA_VE_DOC_ID_ATTR]: string;
  [DATA_VE_COLLECTION_ATTR]: string;
  [DATA_VE_KIND_ATTR]: string;
  [DATA_VE_LOCALE_ATTR]: string;
  [DATA_VE_KEY_ATTR]: string;
}>;

export const identityAttrsOf = ({
  collectionSlug,
  docId,
  key,
  kind,
  locale,
  path,
}: VeIdentity): Attrs => ({
  [DATA_VE_PATH_ATTR]: path,
  [DATA_VE_COLLECTION_ATTR]: collectionSlug,
  [DATA_VE_KIND_ATTR]: kind,
  ...(docId !== undefined && { [DATA_VE_DOC_ID_ATTR]: docId }),
  ...(locale !== undefined && { [DATA_VE_LOCALE_ATTR]: locale }),
  ...(key !== undefined && { [DATA_VE_KEY_ATTR]: key }),
});

export const withVisualEditingPath = (value: unknown): Attrs => {
  const meta = isPlainObject(value) ? value[META_KEY] : undefined;
  return isMetaInfo(meta) ? identityAttrsOf(veIdentityOf(meta)) : {};
};
