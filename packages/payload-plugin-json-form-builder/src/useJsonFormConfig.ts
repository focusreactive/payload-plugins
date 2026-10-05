"use client";

import { useConfig } from "@payloadcms/ui";
import { CONFIG_KEY } from "./config.js";
import type { JsonFormClientConfig } from "./config.js";

export const useJsonFormConfig = (): JsonFormClientConfig => {
  const { config } = useConfig();
  const own = config?.admin?.custom?.[CONFIG_KEY] as JsonFormClientConfig | undefined;
  if (!own) {
    throw new Error(
      "jsonFormPlugin config not found — add it to the plugins array in your Payload config."
    );
  }
  return own;
};
