"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useConfig } from "@payloadcms/ui";
import { CommentsDrawerProvider } from "../CommentsDrawerProvider";
import { CommentsProvider } from "../CommentsProvider";
import type { CommentsPluginConfigStorage } from "../../types";

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
          queries: { retry: 1 },
          mutations: { retry: 0 },
        },
      }),
  );

  const pluginConfig = config.admin?.custom?.commentsPlugin as CommentsPluginConfigStorage | undefined;
  const usernameFieldRawPath = pluginConfig?.usernameFieldPath;
  const usernameFieldPath = usernameFieldRawPath === "" ? undefined : usernameFieldRawPath;

  return (
    <QueryClientProvider client={queryClient}>
      <CommentsProvider usernameFieldPath={usernameFieldPath}>
        <CommentsDrawerProvider>{children}</CommentsDrawerProvider>
      </CommentsProvider>
    </QueryClientProvider>
  );
}
