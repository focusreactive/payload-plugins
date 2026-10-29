import type { FolderId, ItemRef, TreeItem } from "../types.js";
import { fetchChildren, fetchRevision } from "./api.js";
import type { FoldersApiContext } from "./api.js";

/** Key of a folder's children in the cache: `root` for the top level, else the folder's id. */
export type FolderKey = string;

export const rootKey: FolderKey = "root";

export const folderKeyOf = (id: FolderId | null): FolderKey => (id === null ? rootKey : String(id));

/** Key of one tree row: pages and folders can share an id, so the collection is part of it. */
export const itemKeyOf = (item: ItemRef): string => `${item.collection}:${item.id}`;

/** The most rows one request may ask for; the endpoint clamps to the same number. */
const maximumRefreshLimit = 1000;

export const revisionPollIntervalMs = 10_000;

export type ChildrenEntry = {
  /** The message of the last failed request for this folder, cleared by the next success. */
  error: string | null;
  hasMore: boolean;
  items: readonly TreeItem[];
  loadingMore: boolean;
  nextCursor: string | null;
  /** `loading` is a first load with nothing to show; a refresh keeps `loaded` and its rows. */
  phase: "error" | "loaded" | "loading";
  /** Known to be out of date: the next load of this folder reads it again. */
  stale: boolean;
};

export type TreeStoreState = {
  childrenByFolder: Readonly<Record<FolderKey, ChildrenEntry>>;
  /** Folders the user opened, whether or not their children are loaded yet. */
  expanded: readonly FolderKey[];
  /** The tree revision of the last children answer, or `null` before the first one. */
  revision: number | null;
};

export type TreeStoreOptions = {
  baseUrl: string;
  /** For tests; the browser's `fetch` by default. */
  fetchImplementation?: typeof fetch;
  /** The admin locale; `null` when localization is off. */
  locale: string | null;
  /** Rows per children request. */
  pageSize: number;
};

/** What the admin changes in the cache before the server has answered. */
export type OptimisticMove = {
  /** Directly after this sibling inside `toFolder`; without it `position` decides. */
  after?: ItemRef;
  items: ItemRef[];
  /** `start` (default) is the top of the folder. */
  position?: "end" | "start";
  /** The folder the items land in; `null` is the top level. */
  toFolder: FolderId | null;
};

export type OptimisticHandle = {
  /** Folders whose rows or counts the change touched. */
  affectedParents: FolderKey[];
  /** Keeps the change and reads the affected folders again for the server's order and paths. */
  commit: () => Promise<void>;
  /** Puts every row back where it was, whatever else changed in the meantime. */
  rollback: () => void;
};

export type TreeStore = {
  /** Applies a move to the cache at once. Pair it with `commit` or `rollback`. */
  applyOptimisticMove: (move: OptimisticMove) => OptimisticHandle;
  configure: (options: TreeStoreOptions) => void;
  getOptions: () => TreeStoreOptions | null;
  getState: () => TreeStoreState;
  /** Marks the folders out of date and reads the visible ones again. */
  invalidate: (parents: readonly (FolderId | null)[]) => Promise<void>;
  /** Reads a folder's first page unless it is loaded and current. */
  loadChildren: (parent: FolderId | null) => Promise<void>;
  loadMore: (parent: FolderId | null) => Promise<void>;
  /** Asks the server for the revision and reads the visible folders again when it changed. */
  pollRevision: () => Promise<void>;
  /** Reads every visible folder again. */
  refetchVisible: () => Promise<void>;
  reset: () => void;
  /**
   * Applies the move, awaits `request`, then keeps and refreshes on success. On any failure the
   * change is rolled back in full, the affected folders are read again, and the error is rethrown.
   */
  runOptimisticMove: <Result>(
    move: OptimisticMove,
    request: () => Promise<Result>
  ) => Promise<Result>;
  setExpanded: (folder: FolderId, expanded: boolean) => Promise<void>;
  startPolling: (intervalMs?: number) => () => void;
  subscribe: (listener: () => void) => () => void;
  toggleExpanded: (folder: FolderId) => Promise<void>;
};

const initialState: TreeStoreState = { childrenByFolder: {}, expanded: [], revision: null };

const emptyEntry: ChildrenEntry = {
  error: null,
  hasMore: false,
  items: [],
  loadingMore: false,
  nextCursor: null,
  phase: "loading",
  stale: false,
};

const errorMessageOf = (error: unknown): string =>
  error instanceof Error ? error.message : "The request failed";

/** Keeps the first row for each key: a refetch under a changing tree can overlap two pages. */
const withoutDuplicates = (items: readonly TreeItem[]): TreeItem[] => {
  const seen = new Set<string>();
  const unique: TreeItem[] = [];
  for (const item of items) {
    const key = itemKeyOf(item);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  return unique;
};

type Location = { index: number; item: TreeItem; key: FolderKey };

const locate = (
  entries: Readonly<Record<FolderKey, ChildrenEntry>>,
  itemKey: string
): Location | null => {
  for (const [key, entry] of Object.entries(entries)) {
    const index = entry.items.findIndex((item) => itemKeyOf(item) === itemKey);
    if (index !== -1) {
      return { index, item: entry.items[index] as TreeItem, key };
    }
  }

  return null;
};

/** The folder row with this id, wherever the cache holds it. */
const locateFolder = (
  entries: Readonly<Record<FolderKey, ChildrenEntry>>,
  folderKey: FolderKey
): Location | null => {
  for (const [key, entry] of Object.entries(entries)) {
    const index = entry.items.findIndex(
      (item) => item.kind === "folder" && String(item.id) === folderKey
    );
    if (index !== -1) {
      return { index, item: entry.items[index] as TreeItem, key };
    }
  }

  return null;
};

const adjustChildCount = (
  entries: Record<FolderKey, ChildrenEntry>,
  folderKey: FolderKey,
  delta: number
): void => {
  if (folderKey === rootKey || delta === 0) {
    return;
  }
  const location = locateFolder(entries, folderKey);
  if (!location) {
    return;
  }
  const entry = entries[location.key] as ChildrenEntry;
  const items = [...entry.items];
  items[location.index] = {
    ...location.item,
    childCount: Math.max(0, (location.item.childCount ?? 0) + delta),
  };
  entries[location.key] = { ...entry, items };
};

const removeItems = (
  entries: Record<FolderKey, ChildrenEntry>,
  itemKeys: ReadonlySet<string>
): void => {
  for (const [key, entry] of Object.entries(entries)) {
    if (entry.items.some((item) => itemKeys.has(itemKeyOf(item)))) {
      entries[key] = {
        ...entry,
        items: entry.items.filter((item) => !itemKeys.has(itemKeyOf(item))),
      };
    }
  }
};

/** The folders shown right now: the top level, and every opened folder under an opened path. */
const visibleFolderKeys = (state: TreeStoreState): FolderKey[] => {
  const expanded = new Set(state.expanded);
  const visible: FolderKey[] = [];
  const pending: FolderKey[] = [rootKey];
  while (pending.length > 0) {
    const key = pending.shift() as FolderKey;
    const entry = state.childrenByFolder[key];
    if (entry) {
      visible.push(key);
      for (const item of entry.items) {
        if (item.kind === "folder" && expanded.has(String(item.id))) {
          pending.push(String(item.id));
        }
      }
    }
  }

  return visible;
};

/**
 * One store for every tree on the page (spec section 7.1): the children of each folder, which
 * folders are open, and the revision last seen. Framework free, so tests drive it with a fake
 * `fetch`; React reads it through `useTreeStore`.
 */
export const createTreeStore = (initialOptions?: TreeStoreOptions): TreeStore => {
  let options: TreeStoreOptions | undefined = initialOptions;
  let state: TreeStoreState = initialState;
  // A reset bumps the epoch, so an answer to a request sent before it is dropped.
  let epoch = 0;
  // Each request for a folder gets the next number; only the newest answer is applied.
  const requestNumbers = new Map<FolderKey, number>();
  const firstLoads = new Map<FolderKey, Promise<readonly TreeItem[] | null>>();
  let pendingOptimisticChanges = 0;
  const listeners = new Set<() => void>();

  const setState = (next: TreeStoreState): void => {
    state = next;
    for (const listener of listeners) {
      listener();
    }
  };

  const setEntry = (key: FolderKey, entry: ChildrenEntry): void => {
    setState({ ...state, childrenByFolder: { ...state.childrenByFolder, [key]: entry } });
  };

  const requireOptions = (): TreeStoreOptions => {
    if (!options) {
      throw new Error("The tree store has no options yet: call configure() first");
    }

    return options;
  };

  const context = (): FoldersApiContext => {
    const { baseUrl, fetchImplementation } = requireOptions();

    return { baseUrl, fetchImplementation };
  };

  const startRequest = (key: FolderKey): { isCurrent: () => boolean } => {
    const number = (requestNumbers.get(key) ?? 0) + 1;
    requestNumbers.set(key, number);
    const startedEpoch = epoch;

    return { isCurrent: () => startedEpoch === epoch && requestNumbers.get(key) === number };
  };

  const parentOf = (key: FolderKey): FolderId | null => (key === rootKey ? null : key);

  // An opened folder that has no rows yet is read as soon as its parent shows it.
  const foldersToOpen = (items: readonly TreeItem[]): FolderKey[] => {
    const expanded = new Set(state.expanded);

    return items
      .filter((item) => item.kind === "folder")
      .map((item) => String(item.id))
      .filter((key) => expanded.has(key) && !state.childrenByFolder[key]);
  };

  /** Reads a folder from the top. A refresh asks for as many rows as the folder already shows. */
  const readFirstPage = async (
    key: FolderKey,
    refresh: boolean
  ): Promise<readonly TreeItem[] | null> => {
    const { locale, pageSize } = requireOptions();
    const existing = state.childrenByFolder[key];
    const request = startRequest(key);
    if (!existing) {
      setEntry(key, emptyEntry);
    } else if (existing.phase === "error") {
      setEntry(key, { ...existing, error: null, phase: "loading" });
    }
    const limit =
      refresh && existing
        ? Math.min(Math.max(existing.items.length, pageSize), maximumRefreshLimit)
        : pageSize;
    try {
      const response = await fetchChildren(context(), { limit, locale, parent: parentOf(key) });
      if (!request.isCurrent()) {
        return null;
      }
      const items = withoutDuplicates(response.items);
      setState({
        ...state,
        childrenByFolder: {
          ...state.childrenByFolder,
          [key]: {
            error: null,
            hasMore: response.hasMore,
            items,
            loadingMore: false,
            nextCursor: response.nextCursor,
            phase: "loaded",
            stale: false,
          },
        },
        revision: response.revision,
      });

      return items;
    } catch (error) {
      if (!request.isCurrent()) {
        return null;
      }
      const current = state.childrenByFolder[key] ?? emptyEntry;
      // A failed refresh keeps the rows on screen and marks them out of date.
      setEntry(
        key,
        current.items.length > 0 || current.phase === "loaded"
          ? { ...current, error: errorMessageOf(error), loadingMore: false, stale: true }
          : { ...current, error: errorMessageOf(error), phase: "error" }
      );

      return null;
    }
  };

  const loadChildren = async (parent: FolderId | null): Promise<void> => {
    const key = folderKeyOf(parent);
    const existing = state.childrenByFolder[key];
    if (existing?.phase === "loaded" && !existing.stale) {
      return;
    }
    const running = firstLoads.get(key);
    if (running && existing?.phase === "loading") {
      await running;

      return;
    }
    const load = readFirstPage(key, existing?.phase === "loaded");
    firstLoads.set(key, load);
    let items: readonly TreeItem[] | null;
    try {
      items = await load;
    } finally {
      if (firstLoads.get(key) === load) {
        firstLoads.delete(key);
      }
    }
    await Promise.all(foldersToOpen(items ?? []).map((openKey) => loadChildren(openKey)));
  };

  const loadMore = async (parent: FolderId | null): Promise<void> => {
    const key = folderKeyOf(parent);
    const entry = state.childrenByFolder[key];
    if (
      !entry ||
      entry.phase !== "loaded" ||
      !entry.hasMore ||
      !entry.nextCursor ||
      entry.loadingMore
    ) {
      return;
    }
    const { locale, pageSize } = requireOptions();
    const request = startRequest(key);
    setEntry(key, { ...entry, error: null, loadingMore: true });
    try {
      const response = await fetchChildren(context(), {
        cursor: entry.nextCursor,
        limit: pageSize,
        locale,
        parent: parentOf(key),
      });
      if (!request.isCurrent()) {
        return;
      }
      const current = state.childrenByFolder[key] ?? entry;
      const items = withoutDuplicates([...current.items, ...response.items]);
      setState({
        ...state,
        childrenByFolder: {
          ...state.childrenByFolder,
          [key]: {
            ...current,
            error: null,
            hasMore: response.hasMore,
            items,
            loadingMore: false,
            nextCursor: response.nextCursor,
          },
        },
        revision: response.revision,
      });
      await Promise.all(foldersToOpen(response.items).map((openKey) => loadChildren(openKey)));
    } catch (error) {
      if (request.isCurrent()) {
        const current = state.childrenByFolder[key] ?? entry;
        setEntry(key, { ...current, error: errorMessageOf(error), loadingMore: false });
      }
    }
  };

  const refetchVisible = async (): Promise<void> => {
    const visible = visibleFolderKeys(state);
    const visibleSet = new Set(visible);
    // What is loaded but not on screen is only marked; it is read when its folder opens.
    const entries = { ...state.childrenByFolder };
    for (const [key, entry] of Object.entries(entries)) {
      if (!visibleSet.has(key) && !entry.stale) {
        entries[key] = { ...entry, stale: true };
      }
    }
    setState({ ...state, childrenByFolder: entries });
    const refreshed = await Promise.all(visible.map((key) => readFirstPage(key, true)));
    await Promise.all(
      foldersToOpen(refreshed.flatMap((items) => items ?? [])).map((key) => loadChildren(key))
    );
  };

  const invalidate = async (parents: readonly (FolderId | null)[]): Promise<void> => {
    const keys = [...new Set(parents.map(folderKeyOf))];
    const visibleSet = new Set(visibleFolderKeys(state));
    const entries = { ...state.childrenByFolder };
    for (const key of keys) {
      const entry = entries[key];
      if (entry) {
        entries[key] = { ...entry, stale: true };
      }
    }
    setState({ ...state, childrenByFolder: entries });
    const refreshed = await Promise.all(
      keys
        .filter((key) => visibleSet.has(key) && state.childrenByFolder[key])
        .map((key) => readFirstPage(key, true))
    );
    await Promise.all(
      foldersToOpen(refreshed.flatMap((items) => items ?? [])).map((key) => loadChildren(key))
    );
  };

  const setExpanded = (folder: FolderId, expanded: boolean): Promise<void> => {
    const key = String(folder);
    const isExpanded = state.expanded.includes(key);
    if (expanded === isExpanded) {
      return expanded ? loadChildren(key) : Promise.resolve();
    }
    setState({
      ...state,
      expanded: expanded ? [...state.expanded, key] : state.expanded.filter((open) => open !== key),
    });

    return expanded ? loadChildren(key) : Promise.resolve();
  };

  const reset = (): void => {
    epoch += 1;
    requestNumbers.clear();
    firstLoads.clear();
    // The open folders stay open: they are the user's, the rows are only a copy of the server's.
    setState({ ...initialState, expanded: state.expanded });
  };

  const pollRevision = async (): Promise<void> => {
    if (!options || pendingOptimisticChanges > 0) {
      return;
    }
    const startedEpoch = epoch;
    let revision: number;
    try {
      ({ revision } = await fetchRevision(context()));
    } catch {
      // A missed poll is not an error the editor can act on; the next one tries again.
      return;
    }
    // An optimistic change in flight owns the cache; the next poll sees the revision change.
    if (startedEpoch !== epoch || pendingOptimisticChanges > 0) {
      return;
    }
    if (state.revision === null) {
      setState({ ...state, revision });

      return;
    }
    if (revision === state.revision) {
      return;
    }
    setState({ ...state, revision });
    await refetchVisible();
  };

  const startPolling = (intervalMs: number = revisionPollIntervalMs): (() => void) => {
    const handle = setInterval(() => {
      void pollRevision();
    }, intervalMs);

    return () => {
      clearInterval(handle);
    };
  };

  const applyOptimisticMove = (move: OptimisticMove): OptimisticHandle => {
    const movedKeys = new Set(move.items.map(itemKeyOf));
    const sources = [...movedKeys]
      .map((itemKey) => locate(state.childrenByFolder, itemKey))
      .filter((location): location is Location => location !== null);
    const targetKey = folderKeyOf(move.toFolder);
    if (sources.length === 0) {
      return { affectedParents: [], commit: () => Promise.resolve(), rollback: () => undefined };
    }

    const entries: Record<FolderKey, ChildrenEntry> = { ...state.childrenByFolder };
    const deltas = new Map<FolderKey, number>();
    for (const source of sources) {
      deltas.set(source.key, (deltas.get(source.key) ?? 0) - 1);
    }
    deltas.set(targetKey, (deltas.get(targetKey) ?? 0) + sources.length);

    removeItems(entries, movedKeys);

    const target = entries[targetKey];
    let insertedKeys = new Set<string>();
    // A folder still on its first load gets the server's answer, which commit reads again.
    if (target?.phase === "loaded") {
      const moving = sources
        .toSorted((left, right) => left.index - right.index)
        .map(({ item }) => ({ ...item, parentId: move.toFolder }));
      const afterIndex = move.after
        ? target.items.findIndex((item) => itemKeyOf(item) === itemKeyOf(move.after as ItemRef))
        : -1;
      let insertAt: number | null = 0;
      if (afterIndex !== -1) {
        insertAt = afterIndex + 1;
      } else if (move.position === "end") {
        // A folder with more rows to load has no known end, so the row waits for the refresh.
        insertAt = target.hasMore ? null : target.items.length;
      }
      if (insertAt === null) {
        entries[targetKey] = { ...target, stale: true };
      } else {
        const items = [...target.items];
        items.splice(insertAt, 0, ...moving);
        entries[targetKey] = { ...target, items };
        insertedKeys = new Set(moving.map(itemKeyOf));
      }
    }
    for (const [key, delta] of deltas) {
      adjustChildCount(entries, key, delta);
    }

    const affectedParents = [...deltas.keys()];
    for (const key of affectedParents) {
      // Answers still on their way were read before this change and would undo it. A folder on
      // its first load keeps its request: dropping it would leave the folder loading for good.
      if (entries[key]?.phase === "loaded") {
        startRequest(key);
      }
    }
    pendingOptimisticChanges += 1;
    setState({ ...state, childrenByFolder: entries });

    let finished = false;
    const finish = (): boolean => {
      if (finished) {
        return false;
      }
      finished = true;
      pendingOptimisticChanges -= 1;

      return true;
    };

    return {
      affectedParents,
      commit: async () => {
        if (finish()) {
          await invalidate(affectedParents.map((key) => parentOf(key)));
        }
      },
      rollback: () => {
        if (!finish()) {
          return;
        }
        const restored: Record<FolderKey, ChildrenEntry> = { ...state.childrenByFolder };
        removeItems(restored, new Set([...insertedKeys, ...movedKeys]));
        const bySource = new Map<FolderKey, Location[]>();
        for (const source of sources) {
          bySource.set(source.key, [...(bySource.get(source.key) ?? []), source]);
        }
        for (const [key, locations] of bySource) {
          const entry = restored[key];
          if (entry) {
            const items = [...entry.items];
            for (const location of locations.toSorted((left, right) => left.index - right.index)) {
              items.splice(Math.min(location.index, items.length), 0, location.item);
            }
            restored[key] = { ...entry, items };
          }
        }
        for (const [key, delta] of deltas) {
          adjustChildCount(restored, key, -delta);
        }
        setState({ ...state, childrenByFolder: restored });
      },
    };
  };

  return {
    applyOptimisticMove,
    configure: (next) => {
      const previous = options;
      options = next;
      if (previous && (previous.baseUrl !== next.baseUrl || previous.locale !== next.locale)) {
        reset();
      }
    },
    getOptions: () => options ?? null,
    getState: () => state,
    invalidate,
    loadChildren,
    loadMore,
    pollRevision,
    refetchVisible,
    reset,
    runOptimisticMove: async (move, request) => {
      const handle = applyOptimisticMove(move);
      try {
        const result = await request();
        await handle.commit();

        return result;
      } catch (error) {
        handle.rollback();
        // A refused move may mean the tree changed under the editor, so read the folders again.
        await invalidate(handle.affectedParents.map((key) => parentOf(key)));

        throw error;
      }
    },
    setExpanded,
    startPolling,
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    toggleExpanded: (folder) => setExpanded(folder, !state.expanded.includes(String(folder))),
  };
};

let sharedStore: TreeStore | null = null;

/** The one store every tree on the page reads (spec section 7.1). */
export const getSharedTreeStore = (): TreeStore => {
  sharedStore ??= createTreeStore();

  return sharedStore;
};
