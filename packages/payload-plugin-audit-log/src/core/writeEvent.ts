import type { Payload, PayloadRequest } from "payload";
import { CUSTOM_CONFIG_KEY } from "../constants";
import type { AuditAction, AuditEvent, AuditTarget } from "../types";
import { logError } from "../utils/logError";
import { clientInfoOf } from "./clientInfo";
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

export type LogAuditEventArgs = AuditEventArgs & { req?: PayloadRequest; headers?: Headers };

export type OperationEventArgs = AuditEventArgs & { occurredAt?: string };

export type EventSettings = { slug: string; recordIpAndUserAgent: boolean };

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
  args: OperationEventArgs,
  settings: EventSettings,
  headers?: Headers
): AuditEvent | undefined {
  try {
    const event = buildEvent(req, args);
    if (!settings.recordIpAndUserAgent) return event;
    return { ...event, ...clientInfoOf(headers ?? req.headers) };
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
  settings: EventSettings,
  args: OperationEventArgs
): Promise<void> {
  const event = buildEventOrLog(req.payload, req, args, settings);
  if (event) await writeAuditEvent(req.payload, settings.slug, event, req);
}

export async function recordAuditEventOutsideTransaction(
  req: PayloadRequest,
  settings: EventSettings,
  args: AuditEventArgs
): Promise<void> {
  const event = buildEventOrLog(req.payload, req, args, settings);
  if (event) await writeAuditEvent(req.payload, settings.slug, event);
}

export async function logAuditEvent(
  payload: Payload,
  { req, headers, ...args }: LogAuditEventArgs
): Promise<void> {
  const settings = payload.config?.custom?.[CUSTOM_CONFIG_KEY] as EventSettings | undefined;
  if (!settings) return;
  const event = buildEventOrLog(payload, req ?? standaloneLocalReq(), args, settings, headers);
  if (event) await writeAuditEvent(payload, settings.slug, event, req);
}
