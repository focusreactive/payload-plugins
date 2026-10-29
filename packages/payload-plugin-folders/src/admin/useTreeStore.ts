import { useSyncExternalStore } from "react";

import { getSharedTreeStore } from "./store.js";
import type { TreeStore, TreeStoreState } from "./store.js";

/** The store's state, re-read by React whenever it changes. */
export const useTreeStoreState = (store: TreeStore = getSharedTreeStore()): TreeStoreState =>
  useSyncExternalStore(store.subscribe, store.getState, store.getState);
