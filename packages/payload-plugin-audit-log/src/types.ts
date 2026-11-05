import type { Access } from "payload";
import type {
  ACTOR_SOURCES,
  ACTOR_TYPES,
  AUDIT_ACTIONS,
  EVENT_STATUSES,
  TARGET_KINDS,
  VIA_CHANNELS,
} from "./constants";

export type AuditActorType = (typeof ACTOR_TYPES)[number];
export type AuditVia = (typeof VIA_CHANNELS)[number];
export type AuditActorSource = (typeof ACTOR_SOURCES)[number];

export type AuditRef = {
  collection?: string;
  docId?: string;
  label?: string;
};

export type AuditAgentInfo = {
  keyId?: string;
  name?: string;
  model?: string;
  tool?: string;
};

export type AuditActorInput = {
  type: AuditActorType;
  docId?: string | number;
  collection?: string;
  label?: string;
  onBehalfOf?: AuditRef;
  agent?: AuditAgentInfo;
  via?: AuditVia;
};

export type AuditActor = {
  type: AuditActorType;
  docId?: string;
  collection?: string;
  label?: string;
  source: AuditActorSource;
};

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export type AuditTarget = {
  kind: (typeof TARGET_KINDS)[number];
  slug: string;
  docId?: string;
  label?: string;
  locale?: string;
};

export type AuditEvent = {
  occurredAt: string;
  action: AuditAction;
  status: (typeof EVENT_STATUSES)[number];
  actor: AuditActor;
  onBehalfOf?: AuditRef;
  agent?: AuditAgentInfo;
  via: AuditVia;
  target: AuditTarget;
  changes?: string[];
  overrideAccess?: boolean;
  requestId?: string;
  metadata?: Record<string, unknown>;
};

export type AuditRetentionOptions = {
  days: number;
  queue?: string;
  cron?: string;
};

export type AuditLogPluginOptions = {
  enabled?: boolean;
  slug?: string;
  excludeCollections?: string[];
  excludeGlobals?: string[];
  apiKeyCollections?: string[];
  roleFields?: string[];
  retention?: AuditRetentionOptions;
  access?: { read?: Access };
  trackUnattributedWrites?: boolean;
  maxChangedPaths?: number;
};
