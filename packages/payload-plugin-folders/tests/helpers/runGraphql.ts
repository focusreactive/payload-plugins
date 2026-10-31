import { configToSchema } from "@payloadcms/graphql";
import { execute, parse, validate } from "graphql";
import { createPayloadRequest } from "payload";

import type { TestPayload } from "./getTestPayload.js";

export type GraphqlOutcome = { data?: unknown; errors?: string[]; invalid?: string[] };

/** Runs one GraphQL query against the harness as `user`, through Payload's own schema. */
export const runGraphql = async (
  harness: TestPayload,
  user: { id: number | string },
  query: string
): Promise<GraphqlOutcome> => {
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
