export const PLUGIN_NAME = "payload-plugin-audit-log";
export const LOG_PREFIX = `[${PLUGIN_NAME}]`;

export const DEFAULT_SLUG = "audit-events";
export const DEFAULT_FOLDERS_SLUG = "payload-folders";
export const DEFAULT_MAX_CHANGED_PATHS = 200;
export const MAX_RETENTION_DAYS = 36_500;
export const DEFAULT_ROLE_FIELDS = ["role", "roles"] as const;
export const DEFAULT_API_KEY_COLLECTIONS = ["payload-mcp-api-keys"] as const;
export const PURGE_TASK_SLUG = "auditLogPurge";
export const DEFAULT_PURGE_CRON = "0 3 * * *";
export const DEFAULT_PURGE_QUEUE = "default";
export const MAX_EXPORT_ROWS = 100_000;
export const MAX_WHERE_PATHS = 20;
export const TRUNCATED_MARKER = "…";
export const MAX_LOGIN_IDENTIFIER_LENGTH = 254;
export const CUSTOM_CONFIG_KEY = "auditLog";
export const GLOBALS_NAMESPACE = "global";

export const ACTOR_TYPES = [
  "user",
  "api_key",
  "agent",
  "seed",
  "migration",
  "system",
  "anonymous",
] as const;

export const AUDIT_ACTIONS = [
  "doc.create",
  "doc.update",
  "doc.delete",
  "doc.publish",
  "doc.unpublish",
  "doc.restore",
  "doc.duplicate",
  "global.update",
  "global.publish",
  "global.unpublish",
  "auth.login",
  "auth.logout",
  "auth.login_failed",
  "auth.password_reset_requested",
  "auth.password_reset",
  "user.role_changed",
  "apikey.created",
  "apikey.revoked",
  "system.unattributed_write",
  "system.migration",
  "system.seed",
  "audit.export",
  "audit.retention_purge",
] as const;

export const ACTOR_SOURCES = ["context", "als", "auth", "inferred", "plugin"] as const;

export const TARGET_KINDS = ["collection", "global", "auth", "audit", "system"] as const;

export const EVENT_STATUSES = ["success", "failure"] as const;

export const VIA_CHANNELS = ["admin", "rest", "graphql", "local", "mcp", "job"] as const;

export const MIGRATIONS_COLLECTION = "payload-migrations";

export const IGNORED_DIFF_KEYS: ReadonlySet<string> = new Set([
  "id",
  "createdAt",
  "updatedAt",
  "sessions",
  "loginAttempts",
  "lockUntil",
  "salt",
  "hash",
  "resetPasswordToken",
  "resetPasswordExpiration",
  "_verificationToken",
]);

export const AUTH_HIDDEN_FIELDS = [
  "resetPasswordToken",
  "resetPasswordExpiration",
  "resetPasswordRequestedAt",
  "salt",
  "hash",
  "loginAttempts",
  "lockUntil",
  "_verificationToken",
] as const;

export const API_KEY_HIDDEN_FIELDS = ["apiKey", "apiKeyIndex", "hasAPIKey"] as const;

export const CTX_ACTOR = "auditActor";
export const CTX_ACTIVE = "__auditActive";
export const CTX_OP = "__auditOp";
export const CTX_REQUEST_ID = "__auditRequestId";
export const CTX_AUTH_OPERATIONS = "__auditAuthOperations";
export const CTX_MAIN_GLOBAL_READS = "__auditMainGlobalReads";
export const CTX_WRITTEN_DOCS = "__auditWrittenDocs";
