import type {
  TargetLayer,
  VersionsSlice,
} from "../src/server/features/translate-document/targetLayer";

export type { TargetLayer, VersionsSlice };

/**
 * Red-run stub. Points the suite at nothing so a check that stays green is proven to guard nothing.
 * Never imported by src — only by `vitest.red.config.ts`.
 */
export function resolveTargetLayer(_args: {
  versions: VersionsSlice | undefined;
  publishOnTranslation: boolean;
  targetLng: string;
}): TargetLayer {
  throw new Error("not implemented — red run");
}
