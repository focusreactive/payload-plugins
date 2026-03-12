"use client";

import type { ReactNode } from "react";
import { useConfig } from "@payloadcms/ui";
import { CommentsDrawerProvider } from "../CommentsDrawerProvider";
import { CommentsProvider } from "../CommentsProvider";
import type { CommentsPluginConfigStorage } from "../../types";

interface Props {
  children: ReactNode;
}

export function CommentsProviderWrapper({ children }: Props) {
  const { config } = useConfig();

  const pluginConfig = config.admin?.custom?.commentsPlugin as CommentsPluginConfigStorage | undefined;
  const usernameFieldRawPath = pluginConfig?.usernameFieldPath;
  const usernameFieldPath = usernameFieldRawPath === "" ? undefined : usernameFieldRawPath;

  return (
    <CommentsProvider usernameFieldPath={usernameFieldPath}>
      <CommentsDrawerProvider>{children}</CommentsDrawerProvider>
    </CommentsProvider>
  );
}
