import { configToSchema } from "@payloadcms/graphql";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { createPayloadRequest } from "payload";

import type { TestPayload } from "./getTestPayload.js";

type GraphqlModule = typeof import("graphql");

/**
 * `@payloadcms/graphql` resolves its own copy of `graphql`, and a schema only works with the copy
 * that built it, so the module is loaded from beside `@payloadcms/graphql`.
 */
const loadGraphql = async (): Promise<GraphqlModule> => {
  const graphqlPath = createRequire(
    createRequire(import.meta.url).resolve("@payloadcms/graphql")
  ).resolve("graphql");

  return (await import(pathToFileURL(graphqlPath).href)) as GraphqlModule;
};

export type GraphqlOutcome = { data?: unknown; errors?: string[]; invalid?: string[] };

/** Runs one GraphQL query against the harness as `user`, through Payload's own schema. */
export const runGraphql = async (
  harness: TestPayload,
  user: { id: number | string },
  query: string
): Promise<GraphqlOutcome> => {
  const { execute, parse, validate } = await loadGraphql();
  const { schema } = configToSchema(harness.config);
  const document = parse(query);
  const invalid = validate(schema, document);
  if (invalid.length > 0) {
    return { invalid: invalid.map((error) => error.message) };
  }

  const req = await createPayloadRequest({ payload: harness.payload, req: {} } as never);
  req.user = { ...user, collection: "users" } as never;
  const result = await execute({ contextValue: { headers: {}, req }, document, schema });

  return {
    data: result.data,
    errors: result.errors?.map((error) => error.message),
  };
};
