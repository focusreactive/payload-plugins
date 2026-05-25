import type { FieldState } from "payload";

export function getParentPath(path: string): string {
  const parts = path.split(".");
  parts.pop();
  return parts.join(".");
}

export function getPresetTypeFromPath(
  parentPath: string,
  validTypes: string[],
) {
  const last = parentPath.split(".").pop();
  if (last && validTypes.includes(last)) return last;
  return null;
}

function isLexicalState(obj: Record<string, unknown>) {
  const root = obj.root;
  return (
    typeof root === "object" &&
    root !== null &&
    (root as Record<string, unknown>).type === "root"
  );
}

export function cleanPresetData(
  obj: unknown,
  excludeKeys: Set<string>,
): unknown {
  if (obj === null || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanPresetData(item, excludeKeys));
  }

  const record = obj as Record<string, unknown>;

  if (isLexicalState(record)) {
    return obj;
  }

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (!excludeKeys.has(key)) {
      cleaned[key] = cleanPresetData(value, excludeKeys);
    }
  }

  return cleaned;
}

export function buildSubFieldStateFromPreset(
  presetBlockItem: Record<string, unknown>,
  excludeKeys: string[],
): Record<string, FieldState> {
  const excludeSet = new Set(excludeKeys);
  const subFieldState: Record<string, FieldState> = {};

  for (const [key, value] of Object.entries(presetBlockItem)) {
    if (excludeSet.has(key)) continue;
    const cleaned = cleanPresetData(value, excludeSet);
    subFieldState[key] = {
      value: cleaned,
      initialValue: cleaned,
      valid: true,
      passesCondition: true,
    };
  }

  return subFieldState;
}
