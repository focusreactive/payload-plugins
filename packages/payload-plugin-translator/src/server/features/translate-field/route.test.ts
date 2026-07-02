import { describe, it, expect, vi } from "vitest";
import type { CollectionSlug, Field, PayloadRequest } from "payload";

import type { AccessGuard } from "../../shared";
import type { TranslationProvider } from "../../../core/translation-providers";
import type { CollectionSchemaMap } from "../../../types/CollectionSchemaMap";

import { createFieldRoute } from "./route";

// Route-contract tests: pin path + method + access-guard wiring. Handler logic
// and the shared wrappers are covered by their own unit tests.
const schemaMap = new Map([
  ["posts" as CollectionSlug, [{ name: "title", type: "text", localized: true }] as Field[]],
]) as CollectionSchemaMap;
const provider: TranslationProvider = { translate: vi.fn() };
const denyAccess: AccessGuard = { check: vi.fn().mockReturnValue(false) };

describe("createFieldRoute (contract)", () => {
  it("registers POST at {basePath}/field with the default basePath", () => {
    const endpoint = createFieldRoute({ schemaMap, translationProvider: provider });
    expect(endpoint.path).toBe("/translate/field");
    expect(endpoint.method).toBe("post");
  });

  it("honors a custom basePath", () => {
    const endpoint = createFieldRoute({
      schemaMap,
      translationProvider: provider,
      basePath: "/i18n",
    });
    expect(endpoint.path).toBe("/i18n/field");
  });

  it("applies the access guard — a denied request gets 403 and never reaches the handler", async () => {
    const endpoint = createFieldRoute({
      schemaMap,
      translationProvider: provider,
      access: denyAccess,
    });

    const response = await endpoint.handler({} as PayloadRequest);

    expect(response.status).toBe(403);
    expect(denyAccess.check).toHaveBeenCalled();
    expect(provider.translate).not.toHaveBeenCalled();
  });
});
