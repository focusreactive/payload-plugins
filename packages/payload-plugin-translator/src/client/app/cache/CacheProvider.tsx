"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useMemo } from "react";
import type { PropsWithChildren } from "react";

import type { TranslateKitConfig } from "../../../types/wire/TranslateKitConfig.js";
import { TranslateKitConfigProvider } from "../../shared/config/index.js";
import { CacheClientProviderFactory } from "../../shared/providers/CacheClientProvider/index.js";

const queryClient = new CacheClientProviderFactory().create("client");

type CacheProviderProps = PropsWithChildren<TranslateKitConfig>;

export function CacheProvider({ basePath, abilities, collections, children }: CacheProviderProps) {
  const config = useMemo(
    () => ({ basePath, abilities, collections }),
    [basePath, abilities, collections]
  );

  return (
    <TranslateKitConfigProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </TranslateKitConfigProvider>
  );
}

export default CacheProvider;
