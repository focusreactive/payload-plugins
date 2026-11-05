import type {
  CollectionAfterForgotPasswordHook,
  CollectionAfterLoginHook,
  CollectionAfterLogoutHook,
  CollectionAfterOperationHook,
  CollectionBeforeOperationHook,
  PayloadRequest,
} from "payload";
import { auditTarget } from "../core/auditTarget";
import { endAuthOperation, markAuthOperation } from "../core/requestState";
import { labelOf } from "../core/resolveActor";
import type { ResolvedActor } from "../core/resolveActor";
import type { AuditEventArgs } from "../core/writeEvent";
import type { AuditActor } from "../types";
import { failOpen } from "../utils/failOpen";

type AuthUser = { id?: string | number; email?: unknown; name?: unknown; username?: unknown };
type ForgotPasswordArgs = { req?: PayloadRequest; data?: { email?: unknown } };
type RecordEvent = (req: PayloadRequest, args: AuditEventArgs) => Promise<void>;

const OPERATIONS_WRITING_THE_WHOLE_USER: ReadonlySet<string> = new Set([
  "login",
  "refresh",
  "resetPassword",
]);

const authenticatedAs = (slug: string, user: AuthUser): Pick<ResolvedActor, "actor"> => {
  const actor: AuditActor = {
    type: "user",
    docId: String(user.id),
    collection: slug,
    source: "auth",
  };
  const label = labelOf(user);
  if (label) actor.label = label;
  return { actor };
};

const AUTH_EVENT_FAILURE = "could not record the auth event";

export function buildCollectionAuthHooks(slug: string, record: RecordEvent) {
  const beforeOperation: CollectionBeforeOperationHook = async ({ operation, req }) => {
    await failOpen(req.payload, AUTH_EVENT_FAILURE, () => {
      if (OPERATIONS_WRITING_THE_WHOLE_USER.has(operation)) markAuthOperation(req, slug);
    });
  };

  const afterLogin: CollectionAfterLoginHook = async ({ user, req }) => {
    await failOpen(req.payload, AUTH_EVENT_FAILURE, () =>
      record(req, {
        action: "auth.login",
        target: auditTarget("auth", slug, user.id),
        actorOverride: authenticatedAs(slug, user),
      })
    );
    return user;
  };

  const afterLogout: CollectionAfterLogoutHook = async ({ req }) => {
    await failOpen(req.payload, AUTH_EVENT_FAILURE, () =>
      record(req, {
        action: "auth.logout",
        target: auditTarget("auth", slug, req.user?.id),
      })
    );
  };

  const afterForgotPassword: CollectionAfterForgotPasswordHook = async ({ args }) => {
    const { req, data } = (args ?? {}) as ForgotPasswordArgs;
    if (!req) return;
    await failOpen(req.payload, AUTH_EVENT_FAILURE, () =>
      record(req, {
        action: "auth.password_reset_requested",
        target: auditTarget(
          "auth",
          slug,
          undefined,
          typeof data?.email === "string" ? data.email : undefined
        ),
      })
    );
  };

  const afterOperation: CollectionAfterOperationHook = async ({ operation, req, result }) => {
    if (OPERATIONS_WRITING_THE_WHOLE_USER.has(operation)) {
      await failOpen(req.payload, AUTH_EVENT_FAILURE, () => endAuthOperation(req, slug));
    }
    if (operation !== "resetPassword") return result;
    await failOpen(req.payload, AUTH_EVENT_FAILURE, () => {
      const user = (result as { user?: AuthUser } | undefined)?.user;
      return record(req, {
        action: "auth.password_reset",
        target: auditTarget("auth", slug, user?.id),
        ...(user ? { actorOverride: authenticatedAs(slug, user) } : {}),
      });
    });
    return result;
  };

  return { beforeOperation, afterLogin, afterLogout, afterForgotPassword, afterOperation };
}
