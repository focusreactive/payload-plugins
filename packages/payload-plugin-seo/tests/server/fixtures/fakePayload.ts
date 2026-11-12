import { vi } from "vitest";
import { KEYPHRASES_COLLECTION_SLUG } from "../../../src/constants";
import type { IndexRow, Where } from "./indexMatcher";
import { matchesWhere } from "./indexMatcher";

interface FindArgs {
  collection: string;
  where: Where;
  page?: number;
  limit?: number;
}

interface FakeIndexPayloadOptions {
  rows: () => IndexRow[];
  findDocs: (where: Where) => Array<Record<string, unknown>>;
  localeCodes?: string[];
  serverURL?: string;
}

export function fakeIndexPayload({
  rows,
  findDocs,
  localeCodes,
  serverURL,
}: FakeIndexPayloadOptions) {
  return {
    config: {
      localization: localeCodes ? { localeCodes } : false,
      admin: { user: "users" },
      serverURL,
    },
    logger: { warn: vi.fn() },
    collections: { posts: { config: { admin: { useAsTitle: "title" } } } },
    findByID: vi.fn(
      async ({ id }: { id: string }): Promise<{ id: string | number } | null> => ({ id })
    ),
    find: vi.fn(async ({ collection, where, page, limit }: FindArgs) => {
      if (collection !== KEYPHRASES_COLLECTION_SLUG) return { docs: findDocs(where) };

      const matching = rows().filter((row) => matchesWhere(row, where));
      const start = ((page ?? 1) - 1) * (limit ?? matching.length);
      const end = limit ? start + limit : matching.length;

      return { docs: matching.slice(start, end), hasNextPage: end < matching.length };
    }),
    create: vi.fn(async ({ data }: { data: Omit<IndexRow, "id"> }) => ({ id: 100, ...data })),
    update: vi.fn(async ({ data }: { data: Partial<IndexRow> }) => data),
    delete: vi.fn(async () => ({ docs: [] })),
  };
}
