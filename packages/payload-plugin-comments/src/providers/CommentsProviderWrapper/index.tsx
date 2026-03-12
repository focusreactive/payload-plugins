import type { ReactNode } from "react";
import { CommentsDrawerProvider } from "../CommentsDrawerProvider";
import { CommentsProvider } from "../CommentsProvider";

interface Props {
  children: ReactNode;
}

export function CommentsProviderWrapper({ children }: Props) {
  return (
    <CommentsProvider>
      <CommentsDrawerProvider>{children}</CommentsDrawerProvider>
    </CommentsProvider>
  );
}
