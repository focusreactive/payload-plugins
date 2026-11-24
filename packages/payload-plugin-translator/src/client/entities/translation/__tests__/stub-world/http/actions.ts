import { ServerResponse } from "../../../../../../server/shared/index.js";
import type { RouteHandler } from "../../../../../../server/shared/http/withErrorHandler.js";
import { EnqueueInputSchema } from "../../../../../../server/features/enqueue-translation/model.js";
import { CancelInputSchema } from "../../../../../../server/features/cancel/model.js";
import { RunInputSchema } from "../../../../../../server/features/run-translation/model.js";
import { DismissStalenessInputSchema } from "../../../../../../server/features/staleness/model.js";
import type { EnqueueResponse } from "../../../../../../types/wire/ActionBodies.js";
import type { LocaleCode } from "../../../../../../types/wire/primitives.js";

import { localesOf } from "./localesOf.js";
import { NOT_MANAGED, NO_LOCALIZATION } from "../../../../../../server/shared/http/readRefusals.js";
import type { StubDeps } from "./StubDeps.js";

const asked = (target: LocaleCode | LocaleCode[]): LocaleCode[] =>
  typeof target === "string" ? [target] : target;

/** Every caller the guard lets through is authorised: the stub keeps no per-document rights. */
export function enqueue({ world, managed }: StubDeps): RouteHandler {
  return async (req) => {
    const parsed = EnqueueInputSchema.safeParse(await req.json?.());
    if (parsed.error) return ServerResponse.validationError(parsed.error.issues);

    const { collection_slug, collection_id, source_lng, target_lng } = parsed.data;
    if (!managed.has(collection_slug)) return ServerResponse.badRequest(NOT_MANAGED);
    const locales = localesOf(req);
    if (!locales) return ServerResponse.badRequest(NO_LOCALIZATION);
    if (source_lng !== locales.source && !locales.targets.includes(source_lng)) {
      return ServerResponse.badRequest(
        `source_lng "${source_lng}" is not one of this project's configured locales`
      );
    }

    const targets = [...new Set(asked(target_lng))].filter(
      (locale) => locale !== source_lng && locales.targets.includes(locale)
    );
    if (targets.length === 0) {
      return ServerResponse.badRequest(
        "No valid target locales to translate into (all requested locales were the source or unknown)"
      );
    }

    const { queued, busy, assignments } = world.enqueue(
      collection_slug,
      collection_id,
      targets,
      locales
    );
    const body: EnqueueResponse = {
      success: true,
      queued,
      ...(busy.length > 0 ? { busy } : {}),
      assignments,
    };
    return ServerResponse.success(body);
  };
}

export function cancel({ world, managed }: StubDeps): RouteHandler {
  return async (req) => {
    const parsed = CancelInputSchema.safeParse(await req.json?.());
    if (parsed.error) return ServerResponse.validationError(parsed.error.issues);

    const { collection_slug, collection_id, select_all } = parsed.data;
    if (!managed.has(collection_slug)) return ServerResponse.badRequest(NOT_MANAGED);

    if (select_all === true) world.cancelCollection(collection_slug);
    else world.cancel(collection_id.map((id) => ({ collection: collection_slug, id })));
    return ServerResponse.noContent();
  };
}

export function runNow({ world, managed }: StubDeps): RouteHandler {
  return async (req) => {
    const parsed = RunInputSchema.safeParse(req.routeParams);
    if (parsed.error) return ServerResponse.validationError(parsed.error.issues);

    const { collection_slug, collection_id } = parsed.data;
    if (!managed.has(collection_slug)) return ServerResponse.badRequest(NOT_MANAGED);

    const outcome = world.runNow({ collection: collection_slug, id: collection_id });
    if (outcome === "unknown") return ServerResponse.notFound("No run found for this document");
    if (outcome === "already-running") {
      return ServerResponse.tooManyRequests("Translation task is already in progress");
    }
    return ServerResponse.noContent();
  };
}

export function dismissStaleness({ world, managed }: StubDeps): RouteHandler {
  return async (req) => {
    const parsed = DismissStalenessInputSchema.safeParse(await req.json?.());
    if (parsed.error) return ServerResponse.validationError(parsed.error.issues);

    const { collection_slug, collection_id, target_lng } = parsed.data;
    if (!managed.has(collection_slug)) return ServerResponse.badRequest(NOT_MANAGED);
    const locales = localesOf(req);
    if (!locales) return ServerResponse.badRequest(NO_LOCALIZATION);

    world.dismiss({ collection: collection_slug, id: collection_id }, target_lng, locales);
    return ServerResponse.success({ success: true });
  };
}
