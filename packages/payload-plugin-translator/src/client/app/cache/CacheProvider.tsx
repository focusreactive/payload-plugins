"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { PropsWithChildren } from "react";

import type { TranslateKitConfig } from "../../../types/wire/TranslateKitConfig.js";
import {
  HttpTranslationRepository,
  TranslationRepositoryProvider,
} from "../../entities/translation/index.js";
import { createRequest } from "../../shared/api/createRequest.js";
import { TranslateKitConfigProvider } from "../../shared/config/index.js";
import { useApiBase } from "../../shared/lib/payload/hooks/useApiBase.js";
import { CacheClientProviderFactory } from "../../shared/providers/CacheClientProvider/index.js";

/** Under the config provider, because the API base reads the plugin's `basePath` from it. */
function HttpRepositoryProvider({ children }: PropsWithChildren) {
  const baseURL = useApiBase();
  const repository = useMemo(
    () => new HttpTranslationRepository(createRequest({ baseURL })),
    [baseURL]
  );
  return (
    <TranslationRepositoryProvider repository={repository}>
      {children}
    </TranslationRepositoryProvider>
  );
}

type CacheProviderProps = PropsWithChildren<TranslateKitConfig>;

/** The admin's composition root: each mount owns its cache and its repository. */
export function CacheProvider({ basePath, abilities, collections, children }: CacheProviderProps) {
  const config = useMemo(
    () => ({ basePath, abilities, collections }),
    [basePath, abilities, collections]
  );
  const [queryClient] = useState(() => new CacheClientProviderFactory().create("client"));

  return (
    <TranslateKitConfigProvider config={config}>
      <HttpRepositoryProvider>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </HttpRepositoryProvider>
    </TranslateKitConfigProvider>
  );
}

export default CacheProvider;
