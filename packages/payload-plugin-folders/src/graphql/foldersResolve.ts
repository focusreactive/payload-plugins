import type { Config, PayloadRequest, User } from "payload";

import { resolvePath } from "../core/resolve.js";

type GraphQLExtension = NonNullable<NonNullable<Config["graphQL"]>["queries"]>;

type FoldersResolveArgs = { draft?: boolean | null; locale?: string | null; path: string };

/**
 * The `foldersResolve(path: String!, locale: String, draft: Boolean)` query of spec section 10.2.
 * It answers `{ type, collection, id, fullPath, redirectTo, alternates }` and not the document:
 * the page is then fetched with the collection's own GraphQL query, which applies its own access
 * and field selection. GraphQL has no locale-qualified `where`, so a page that falls back to the
 * default locale's slug is found by this query and by no `where` of the stock queries.
 * `alternates` is a list of `{ locale, path }`, because the GraphQL type system has no map.
 *
 * Public by default: it reads as `req.user`, published pages only, like the REST endpoint.
 */
export const buildFoldersResolveQueries = (): GraphQLExtension => (GraphQL) => {
  const alternateType = new GraphQL.GraphQLObjectType({
    name: "FoldersAlternate",
    fields: {
      locale: { type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString) },
      path: { type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString) },
    },
  });
  const resultType = new GraphQL.GraphQLObjectType({
    name: "FoldersResolveResult",
    fields: {
      alternates: {
        type: new GraphQL.GraphQLNonNull(
          new GraphQL.GraphQLList(new GraphQL.GraphQLNonNull(alternateType))
        ),
      },
      collection: { type: GraphQL.GraphQLString },
      fullPath: { type: GraphQL.GraphQLString },
      id: { type: GraphQL.GraphQLID },
      redirectTo: { type: GraphQL.GraphQLString },
      type: { type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString) },
    },
  });

  return {
    foldersResolve: {
      type: resultType,
      args: {
        draft: { type: GraphQL.GraphQLBoolean },
        locale: { type: GraphQL.GraphQLString },
        path: { type: new GraphQL.GraphQLNonNull(GraphQL.GraphQLString) },
      },
      resolve: async (
        _source: unknown,
        args: FoldersResolveArgs,
        context: { req: PayloadRequest }
      ) => {
        const { req } = context;
        const result = await resolvePath(req.payload, {
          // Only the id and path of the page leave this query, so the document is not populated.
          depth: 0,
          draft: args.draft ?? false,
          locale: args.locale ?? undefined,
          path: args.path,
          user: (req.user as User | null) ?? null,
        });

        if (result.type === "page") {
          return {
            alternates: Object.entries(result.alternates).map(([locale, path]) => ({
              locale,
              path,
            })),
            collection: result.collection,
            fullPath: result.fullPath,
            id: String(result.doc.id),
            redirectTo: null,
            type: "page",
          };
        }

        return {
          alternates: [],
          collection: null,
          fullPath: null,
          id: null,
          redirectTo: result.type === "redirect" ? result.to : null,
          type: result.type,
        };
      },
    },
  };
};
