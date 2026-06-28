"use client";

import type { ReactNode } from "react";
import { registerSeoClientConfig } from "../client-config/registry";
import type { SeoClientConfig } from "../client-config/registry";

export function SeoClientConfigProvider({
  config,
  children,
}: {
  config: SeoClientConfig;
  children: ReactNode;
}) {
  registerSeoClientConfig(config);

  return <>{children}</>;
}

export default SeoClientConfigProvider;
