import type { CustomRegistrationKey } from "../types/query";
import { CUSTOM_KEY_PATTERNS } from "../utils/ga4/deriveMissing";

export interface MappedGa4Error {
  status: number;
  message: string;
  setupRequired?: true;
  missingKey?: CustomRegistrationKey;
}

function deriveMissingKey(msg: string): CustomRegistrationKey | undefined {
  for (const { key, regex } of CUSTOM_KEY_PATTERNS) {
    if (regex.test(msg)) return key;
  }

  return undefined;
}

function detailToString(detail: unknown): string {
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        if (typeof d === "string") return d;
        if (d && typeof d === "object") {
          const obj = d as Record<string, unknown>;
          const candidate = obj.description ?? obj.message ?? obj.detail ?? obj.reason;
          if (typeof candidate === "string") return candidate;
        }
        return "";
      })
      .filter(Boolean)
      .join("; ");
  }

  return "";
}

function enrichMessage(err: unknown): string {
  const base = err instanceof Error ? err.message : String(err);

  if (!err || typeof err !== "object") return base;

  const carriers = err as Record<string, unknown>;
  const detailStrings = [carriers.details, carriers.statusDetails, carriers.metadata]
    .map(detailToString)
    .filter(Boolean);

  if (detailStrings.length === 0) return base;

  const detailText = detailStrings.join("; ");

  const baseHasField = deriveMissingKey(base) !== undefined;
  const trimmedBase = base.trim();
  const baseLacksDetail = trimmedBase === "" || trimmedBase.endsWith(":");

  if (baseHasField) return `${base} (${detailText})`;
  if (baseLacksDetail) return `${base}${detailText}`;
  return `${base} ${detailText}`;
}

export function mapGa4Error(err: unknown): MappedGa4Error {
  const msg = enrichMessage(err);

  if (msg.includes("INVALID_ARGUMENT")) {
    const missingKey = deriveMissingKey(msg);

    return {
      status: 400,
      message: msg,
      ...(missingKey ? { setupRequired: true as const, missingKey } : {}),
    };
  }

  if (msg.includes("PERMISSION_DENIED")) {
    return {
      status: 403,
      message: "GA4 service account lacks permission for this property",
    };
  }

  if (msg.includes("RESOURCE_EXHAUSTED")) {
    return {
      status: 429,
      message: "Analytics quota exceeded; try again in a few minutes",
    };
  }

  if (msg.includes("UNAUTHENTICATED")) {
    return {
      status: 500,
      message: "GA4 service account credentials are invalid",
    };
  }

  return {
    status: 500,
    message: msg || "Unknown analytics error",
  };
}
