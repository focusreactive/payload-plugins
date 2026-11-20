import type { CollectionSlug, TypedUser } from "payload";

import { view } from "../engine/view.js";
import type { Caller, InstanceView, WorkflowDefinition } from "../types.js";
import type { Ctx } from "./commit.js";
import { allowedBy } from "./config.js";
import { toState } from "./store.js";
import type { InstanceDoc } from "./store.js";

/** Who the system is when a view is built for it (effect handlers); it may fire nothing. */
export const SYSTEM_CALLER: Caller = {
  actor: { id: "system", collection: "", via: "api" },
  roles: [],
};

/** The definition a run was started from; a stand-in with no stages if it was removed. */
export const definitionForDoc = (ctx: Ctx, doc: InstanceDoc): WorkflowDefinition =>
  ctx.resolved.definitions.find((def) => def.name === doc.workflow) ?? {
    name: doc.workflow,
    collections: [doc.subjectCollection],
    initialStage: doc.stage,
    stages: [],
  };

export const titleOf = (
  ctx: Ctx,
  collection: string,
  subject: Record<string, unknown> | null
): string | undefined => {
  const field = ctx.payload.collections[collection as CollectionSlug]?.config.admin?.useAsTitle;
  const value = field && subject ? subject[field] : undefined;
  return typeof value === "string" || typeof value === "number" ? String(value) : undefined;
};

/**
 * The engine's view plus what only the server knows: id, subject and whether `user` may abort
 * (computed for `user`, never for `req.user`; `false` without one).
 */
export const presentInstance = async (
  ctx: Ctx,
  doc: InstanceDoc,
  caller: Caller | null,
  subject: Record<string, unknown> | null,
  user?: TypedUser | null
): Promise<InstanceView> => {
  const def = definitionForDoc(ctx, doc);
  const projected = view(def, toState(doc), caller ?? SYSTEM_CALLER, {
    doc: subject,
    now: new Date(),
  });
  const title = titleOf(ctx, doc.subjectCollection, subject);
  return {
    ...projected,
    id: String(doc.id),
    canAbort:
      doc.status === "active" && user
        ? await allowedBy(ctx.resolved.access.abort, {
            req: ctx.req,
            user,
            workflow: def,
            collection: doc.subjectCollection,
            id: doc.subjectId,
            doc: subject,
          })
        : false,
    subject: {
      collection: doc.subjectCollection,
      id: doc.subjectId,
      ...(title === undefined ? {} : { title }),
    },
  };
};
