"use client";

import { useFormFields } from "@payloadcms/ui";

import { buildStablePath } from "../utils/buildStablePath";

export function useStablePath(positionPath: string) {
  return useFormFields(([fields]) =>
    buildStablePath(
      positionPath,
      (idPath) => fields[idPath]?.value as string | undefined
    )
  );
}
