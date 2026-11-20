import type { CollectionConfig, Config, Endpoint } from "payload";

import { denyUnlessAllowed } from "../../endpoints.js";
import { ENDPOINT_BASE, REFERENCES_COMPONENT } from "../../lib/constants.js";
import type { ResolvedRelationsGraphOptions } from "../../types.js";
import { DEFAULT_LIMIT, findReferences } from "./findReferences.js";

const MAX_LIMIT = 100;

/** Whether the "where is this used?" lookup is enabled for a collection. */
export const referencesEnabledFor = (
  options: Pick<ResolvedRelationsGraphOptions, "exclude" | "references">,
  slug: string
): boolean => {
  if (options.exclude.includes(slug)) {
    return false;
  }
  return Array.isArray(options.references) ? options.references.includes(slug) : options.references;
};

const parseLimit = (raw: string | null | undefined): number => {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, MAX_LIMIT) : DEFAULT_LIMIT;
};

/**
 * `GET /api/relations-graph/references?collection=<slug>&id=<id>[&limit=10]` — the documents and
 * globals that reference this document, grouped by source and field. Runs with the requesting
 * user's access, so documents they cannot read are never listed or counted.
 */
const referencesEndpoint = (options: ResolvedRelationsGraphOptions): Endpoint => ({
  handler: async (req) => {
    const denied = await denyUnlessAllowed(req);
    if (denied) {
      return denied;
    }

    const collection = req.searchParams?.get("collection") ?? "";
    const id = req.searchParams?.get("id") ?? "";
    if (!(collection && id)) {
      return Response.json({ error: "`collection` and `id` are required" }, { status: 400 });
    }
    if (!(req.payload.collections[collection] && referencesEnabledFor(options, collection))) {
      return Response.json(
        { error: `References are not enabled for collection "${collection}"` },
        { status: 404 }
      );
    }

    const result = await findReferences({
      collection,
      id,
      limit: parseLimit(req.searchParams?.get("limit")),
      overrideAccess: false,
      req,
    });
    return Response.json(result);
  },
  method: "get",
  path: `${ENDPOINT_BASE}/references`,
});

/** REST endpoints of the "where is this used?" feature. */
export const referencesEndpoints = (options: ResolvedRelationsGraphOptions): Endpoint[] => [
  referencesEndpoint(options),
];

const withReferencesControl = (collection: CollectionConfig): CollectionConfig => ({
  ...collection,
  admin: {
    ...collection.admin,
    components: {
      ...collection.admin?.components,
      edit: {
        ...collection.admin?.components?.edit,
        // Rendered inside the document view, so the client component can read the id from
        // `useDocumentInfo`; it renders nothing on the create view.
        beforeDocumentControls: [
          ...(collection.admin?.components?.edit?.beforeDocumentControls ?? []),
          { path: REFERENCES_COMPONENT },
        ],
      },
    },
  },
});

/** Adds the "where is this used?" control to document edit views. */
export const withReferencesUI = (
  config: Config,
  options: ResolvedRelationsGraphOptions
): Config => ({
  ...config,
  collections: config.collections?.map((collection) =>
    referencesEnabledFor(options, collection.slug) ? withReferencesControl(collection) : collection
  ),
});

export { findReferences } from "./findReferences.js";
export type {
  FindReferencesArgs,
  ReferenceField,
  ReferenceGroup,
  ReferenceSource,
  ReferencesResult,
  ReferencingDoc,
} from "./types.js";
