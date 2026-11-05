import type { Payload, PayloadRequest } from "payload";
import { CUSTOM_CONFIG_KEY } from "../constants";
import type { AuditAction, AuditEvent, AuditTarget } from "../types";
import { logError } from "../utils/logError";
import { failOpenInsert } from "./failOpenInsert";
import { getRequestId } from "./requestState";
import type { ReqLike, ResolvedActor } from "./resolveActor";
import { resolveActor } from "./resolveActor";

export type AuditEventArgs = {
  action: AuditAction;
  target: AuditTarget;
  status?: AuditEvent["status"];
  changes?: string[];
  overrideAccess?: boolean;
  metadata?: Record<string, unknown>;
  actorOverride?: Pick<ResolvedActor, "actor"> & Partial<ResolvedActor>;
  localized?: boolean;
};

export type LogAuditEventArgs = AuditEventArgs & { req?: PayloadRequest };

export type OperationEventArgs = AuditEventArgs & { occurredAt?: string };

type PluginRuntimeSettings = { slug: string };

export const standaloneLocalReq = (): ReqLike => ({ context: {}, payloadAPI: "local" });

export function buildEvent(
  req: ReqLike & { locale?: unknown },
  args: OperationEventArgs
): AuditEvent {
  const resolved = resolveActor(req);
  const who = args.actorOverride ? { ...resolved, ...args.actorOverride } : resolved;
  const locale =
    args.localized !== false && typeof req.locale === "string" ? req.locale : undefined;
  const event: AuditEvent = {
    occurredAt: args.occurredAt ?? new Date().toISOString(),
    action: args.action,
    status: args.status ?? "success",
    actor: who.actor,
    via: who.via,
    target: locale && !args.target.locale ? { ...args.target, locale } : args.target,
    requestId: getRequestId(req),
  };
  if (who.onBehalfOf) event.onBehalfOf = who.onBehalfOf;
  if (who.agent) event.agent = who.agent;
  if (args.changes) event.changes = args.changes;
  if (args.overrideAccess !== undefined) event.overrideAccess = args.overrideAccess;
  if (args.metadata) event.metadata = args.metadata;
  return event;
}

function buildEventOrLog(
  payload: Payload,
  req: ReqLike & { locale?: unknown },
  args: OperationEventArgs
): AuditEvent | undefined {
  try {
    return buildEvent(req, args);
  } catch (err) {
    logError(payload, "could not build the audit event", err);
    return undefined;
  }
}

export async function writeAuditEvent(
  payload: Payload,
  slug: string,
  event: AuditEvent,
  req?: PayloadRequest
): Promise<void> {
  await failOpenInsert(payload, req, (writeReq) =>
    payload.db.create({ collection: slug, data: event as never, req: writeReq, returning: false })
  );
}

export async function recordAuditEvent(
  req: PayloadRequest,
  slug: string,
  args: OperationEventArgs
): Promise<void> {
  const event = buildEventOrLog(req.payload, req, args);
  if (event) await writeAuditEvent(req.payload, slug, event, req);
}

export async function recordAuditEventOutsideTransaction(
  req: PayloadRequest,
  slug: string,
  args: AuditEventArgs
): Promise<void> {
  const event = buildEventOrLog(req.payload, req, args);
  if (event) await writeAuditEvent(req.payload, slug, event);
}

export async function logAuditEvent(payload: Payload, args: LogAuditEventArgs): Promise<void> {
  const settings = payload.config?.custom?.[CUSTOM_CONFIG_KEY] as PluginRuntimeSettings | undefined;
  if (!settings) return;
  const event = buildEventOrLog(payload, args.req ?? standaloneLocalReq(), args);
  if (event) await writeAuditEvent(payload, settings.slug, event, args.req);
}
