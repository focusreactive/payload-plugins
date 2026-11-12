import type { CollectionConfig } from "payload";
import { TRUNCATED_MARKER } from "../constants";

type AuthConfig = CollectionConfig["auth"];

const isLocalStrategyEnabled = (auth: AuthConfig): boolean => {
  const localStrategy = typeof auth === "object" ? auth.disableLocalStrategy : undefined;
  return (
    !localStrategy || (typeof localStrategy === "object" && Boolean(localStrategy.enableFields))
  );
};

export const usesApiKeys = (auth: AuthConfig): boolean =>
  typeof auth === "object" && Boolean(auth.useAPIKey);

export function submittedSecretFields(
  auth: AuthConfig,
  data: Record<string, unknown> | undefined,
  savingDraft: boolean
): string[] {
  if (!auth || !data) return [];
  const secretFields: string[] = [];
  const savesPassword = isLocalStrategyEnabled(auth) && !savingDraft;
  if (savesPassword && typeof data.password === "string" && data.password !== "") {
    secretFields.push("password");
  }
  const apiKeySubmitted = data.apiKey !== undefined;
  if (usesApiKeys(auth) && apiKeySubmitted) secretFields.push("apiKey");
  return secretFields;
}

export function withSecretFieldsFirst(
  secretFields: readonly string[],
  changes: string[],
  maxChangedPaths: number
): string[] {
  if (secretFields.length === 0) return changes;
  const wasTruncated = changes.at(-1) === TRUNCATED_MARKER;
  const merged = [
    ...secretFields,
    ...changes.filter((path) => path !== TRUNCATED_MARKER && !secretFields.includes(path)),
  ];
  if (merged.length > maxChangedPaths)
    return [...merged.slice(0, maxChangedPaths), TRUNCATED_MARKER];
  return wasTruncated ? [...merged, TRUNCATED_MARKER] : merged;
}
