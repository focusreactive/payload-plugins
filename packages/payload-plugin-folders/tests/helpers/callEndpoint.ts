import { handleEndpoints } from "payload";
import type { Payload, SanitizedConfig } from "payload";

export const testUser = {
  email: "endpoint-tester@example.com",
  password: "test-password",
};

export type CallEndpointArgs = {
  /** JSON body, sent for anything but GET. */
  body?: unknown;
  config: SanitizedConfig;
  method?: "DELETE" | "GET" | "PATCH" | "POST" | "PUT";
  /** Path under /api, with a leading slash, e.g. `/pages?limit=5`. */
  path: string;
  payload: Payload;
  /** Call without logging in. */
  anonymous?: boolean;
  /**
   * Runs the request on the Payload instance cached under this key (`TestPayload.cacheKey`). Without
   * it Payload opens its own instance on the same database, with its own tree lock and pool.
   */
  payloadInstanceCacheKey?: string;
  /** Log in as this user instead of the shared admin test user. */
  user?: { email: string; password: string };
};

export type EndpointResult<TBody = unknown> = {
  body: TBody;
  response: Response;
  status: number;
};

const ensureTestUser = async (payload: Payload) => {
  const { totalDocs } = await payload.count({
    collection: "users",
    overrideAccess: true,
    where: { email: { equals: testUser.email } },
  });

  if (totalDocs === 0) {
    await payload.create({
      collection: "users",
      data: { ...testUser, role: "admin" },
      overrideAccess: true,
    });
  }
};

/** Runs one REST request through Payload's own router, the same code path as the Next.js route. */
export const callEndpoint = async <TBody = unknown>({
  anonymous = false,
  body,
  config,
  method = "GET",
  path,
  payload,
  payloadInstanceCacheKey,
  user = testUser,
}: CallEndpointArgs): Promise<EndpointResult<TBody>> => {
  const headers = new Headers({ "Content-Type": "application/json" });

  if (!anonymous) {
    if (user === testUser) {
      await ensureTestUser(payload);
    }
    const { token } = await payload.login({
      collection: "users",
      data: user,
    });
    headers.set("Authorization", `JWT ${token}`);
  }

  const response = await handleEndpoints({
    config,
    payloadInstanceCacheKey,
    request: new Request(`http://localhost:4078/api${path}`, {
      body: method === "GET" || body === undefined ? undefined : JSON.stringify(body),
      headers,
      method,
    }),
  });

  const text = await response.text();
  return {
    body: (text ? JSON.parse(text) : null) as TBody,
    response,
    status: response.status,
  };
};
