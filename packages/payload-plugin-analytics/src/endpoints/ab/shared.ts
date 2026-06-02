import { mapGa4Error } from "../errorMapping";
import { getPluginConfig } from "../../config";
import { resolveAbConfig } from "../../config/resolveAbConfig";

export function abDimensionKeys(): string[] {
  const ab = resolveAbConfig(getPluginConfig().ab);
  if (!ab) return [];

  return [ab.dimensions.experiment, ab.dimensions.variant, ab.dimensions.visitorId];
}

export function abSetupGate(err: unknown): { missing: string[] } | null {
  const mapped = mapGa4Error(err);
  if (mapped.status !== 400 || !mapped.message.includes("INVALID_ARGUMENT")) return null;

  const keys = abDimensionKeys();
  if (keys.length === 0) return null;

  const named = keys.filter((k) => mapped.message.includes(`customEvent:${k}`));

  return { missing: named.length ? named : keys };
}
