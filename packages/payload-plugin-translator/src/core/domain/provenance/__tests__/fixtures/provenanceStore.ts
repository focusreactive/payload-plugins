import { vi } from "vitest";

import type { ProvenanceStore } from "../../ProvenanceStore.interface.js";

/** Every method a spy, so a check names only the one it cares about and the rest stay callable. */
export type ProvenanceStoreDouble = {
  [M in keyof ProvenanceStore]: ReturnType<typeof vi.fn>;
};

/**
 * A `ProvenanceStore` whose methods all answer, overridable one at a time.
 *
 * It lives beside the port rather than beside any one caller: adding a method to `ProvenanceStore`
 * should cost one edit here, not one in each suite that happens to construct a store.
 */
export const storeDouble = (
  overrides: Partial<ProvenanceStoreDouble> = {}
): ProvenanceStore & ProvenanceStoreDouble =>
  ({
    upsert: vi.fn().mockResolvedValue(undefined),
    find: vi.fn().mockResolvedValue(null),
    findByDocument: vi.fn().mockResolvedValue([]),
    rebaseSourceFingerprint: vi.fn().mockResolvedValue(undefined),
    deleteByDocument: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as ProvenanceStore & ProvenanceStoreDouble;
