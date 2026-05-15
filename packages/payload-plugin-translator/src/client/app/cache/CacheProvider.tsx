"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";

import { CacheClientProviderFactory } from "../../shared/providers/CacheClientProvider";
import { TranslateKitConfigProvider } from "../config";

const queryClient = new CacheClientProviderFactory().create("client");

type CacheProviderProps = PropsWithChildren<{
  basePath?: string;
}>;

export function CacheProvider({ basePath, children }: CacheProviderProps) {
  return (
    <TranslateKitConfigProvider basePath={basePath}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </TranslateKitConfigProvider>
  );
}

export default CacheProvider;
