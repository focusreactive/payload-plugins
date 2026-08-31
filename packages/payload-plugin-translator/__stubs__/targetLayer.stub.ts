import type {
  TargetLayer,
  VersionsSlice,
} from "../src/server/features/translate-document/targetLayer";

export type { TargetLayer, VersionsSlice };

/** Used only by `vitest.red.config.ts`; never imported by `src`. */
export function resolveTargetLayer(_args: {
  versions: VersionsSlice | undefined;
  publishOnTranslation: boolean;
  targetLng: string;
}): TargetLayer {
  throw new Error("not implemented — red run");
}
