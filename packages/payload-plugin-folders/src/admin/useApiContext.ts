import { useMemo } from "react";

import type { FoldersApiContext } from "./api.js";
import type { TreeStore } from "./store.js";

/** Where the plugin's endpoints live, from the store the tree was configured with. */
export const useApiContext = (store: TreeStore): FoldersApiContext => {
  const options = store.getOptions();
  const baseUrl = options?.baseUrl ?? "";
  const fetchImplementation = options?.fetchImplementation;

  return useMemo(() => ({ baseUrl, fetchImplementation }), [baseUrl, fetchImplementation]);
};
