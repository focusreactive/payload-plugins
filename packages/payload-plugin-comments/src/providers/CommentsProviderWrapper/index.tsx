"use client";

import { type ReactNode } from "react";
import { useConfig } from "@payloadcms/ui";
import { CommentsDrawerProvider } from "../CommentsDrawerProvider";
import { CommentsFilterProvider } from "../CommentsFilterProvider";
import { CommentsProvider } from "../CommentsProvider";
import { CommentsQueryClientProvider } from "../CommentsQueryClientProvider";
import type { CommentsPluginConfigStorage } from "../../types";

import "../../styles.css";

interface Props {
  children: ReactNode;
}

export function CommentsProviderWrapper({ children }: Props) {
  const { config } = useConfig();

  const pluginConfig = config.admin?.custom?.commentsPlugin as CommentsPluginConfigStorage | undefined;
  const usernameFieldRawPath = pluginConfig?.usernameFieldPath;
  const usernameFieldPath = usernameFieldRawPath === "" ? undefined : usernameFieldRawPath;

  return (
    <CommentsQueryClientProvider>
      <CommentsProvider usernameFieldPath={usernameFieldPath}>
        <CommentsDrawerProvider>
          <CommentsFilterProvider>{children}</CommentsFilterProvider>
        </CommentsDrawerProvider>
      </CommentsProvider>
    </CommentsQueryClientProvider>
  );
}
