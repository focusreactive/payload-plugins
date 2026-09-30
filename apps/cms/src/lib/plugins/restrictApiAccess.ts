import type { Access, AccessArgs, Plugin, PayloadRequest } from "payload";

export interface RestrictApiAccessOptions {
  collectionsWithPublicFiles?: string[];
  globalsWithPublicRead?: string[];
}

const ADMIN_PANEL_ACCESS_KEY = "admin";

const isRestOrGraphQLRequest = (req: PayloadRequest) =>
  req.payloadAPI === "REST" || req.payloadAPI === "GraphQL";

const requireAuthenticatedApiUser =
  (access: Access, { allowPublicFiles = false } = {}): Access =>
  (args: AccessArgs) => {
    const { req, isReadingStaticFile } = args;
    const isPublicFileRequest = allowPublicFiles && isReadingStaticFile === true;

    if (isRestOrGraphQLRequest(req) && !req.user && !isPublicFileRequest) {
      return false;
    }

    return access(args);
  };

const protectAccessFunctions = <T extends Record<string, unknown>>(
  access: T | undefined,
  { allowPublicFiles = false, publicOperations = [] as string[] } = {}
): T | undefined => {
  if (!access) {
    return access;
  }

  const protectedAccess: Record<string, unknown> = { ...access };

  for (const [operation, accessFunction] of Object.entries(access)) {
    const isSkipped =
      typeof accessFunction !== "function" ||
      operation === ADMIN_PANEL_ACCESS_KEY ||
      publicOperations.includes(operation);

    if (isSkipped) {
      continue;
    }

    protectedAccess[operation] = requireAuthenticatedApiUser(accessFunction as Access, {
      allowPublicFiles: allowPublicFiles && operation === "read",
    });
  }

  return protectedAccess as T;
};

export const restrictApiAccess =
  ({
    collectionsWithPublicFiles = [],
    globalsWithPublicRead = [],
  }: RestrictApiAccessOptions = {}): Plugin =>
  (config) => ({
    ...config,
    collections: config.collections?.map((collection) => ({
      ...collection,
      access: protectAccessFunctions(collection.access, {
        allowPublicFiles: collectionsWithPublicFiles.includes(collection.slug),
      }),
    })),
    globals: config.globals?.map((global) => ({
      ...global,
      access: protectAccessFunctions(global.access, {
        publicOperations: globalsWithPublicRead.includes(global.slug) ? ["read"] : [],
      }),
    })),
  });
