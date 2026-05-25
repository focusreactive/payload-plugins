"use client";

import { useConfig } from "@payloadcms/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from 'react';
import type { ReactNode } from 'react';

import type { CommentsPluginConfigStorage } from "../../types";
import { CommentsDrawerProvider } from "../CommentsDrawerProvider";
import { CommentsFilterProvider } from "../CommentsFilterProvider";
import { CommentsProvider } from "../CommentsProvider";

import "../../styles.css";

interface Props {
  children: ReactNode;
}

export function CommentsProviderWrapper({ children }: Props) {
  const { config } = useConfig();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          mutations: { retry: 0 },
          queries: { retry: 1 },
        },
      })
  );

  const pluginConfig = config.admin?.custom?.commentsPlugin as
    | CommentsPluginConfigStorage
    | undefined;
  const usernameFieldRawPath = pluginConfig?.usernameFieldPath;
  const usernameFieldPath =
    usernameFieldRawPath === "" ? undefined : usernameFieldRawPath;

  return (
    <QueryClientProvider client={queryClient}>
      <CommentsProvider usernameFieldPath={usernameFieldPath}>
        <CommentsDrawerProvider>
          <CommentsFilterProvider>{children}</CommentsFilterProvider>
        </CommentsDrawerProvider>
      </CommentsProvider>
    </QueryClientProvider>
  );
}
