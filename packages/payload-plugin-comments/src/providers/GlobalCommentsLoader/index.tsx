import { setPayloadConfig } from "../../config";
import { GlobalCommentsHydrator } from "./GlobalCommentsHydrator";
import type { Payload } from "payload";
import type { ReactNode } from "react";
import { syncAllCommentsData } from "../../services/syncAllCommentsData";

interface Props {
  children: ReactNode;
  payload: Payload;
  locale?: string;
}

export async function GlobalCommentsLoader({ children, payload, locale }: Props) {
  setPayloadConfig(payload.config);

  const res = await syncAllCommentsData({ payload, locale });

  if (res.success) {
    const { comments, documentTitles, mentionUsers, fieldLabels, collectionLabels, globalLabels } = res.data;

    return (
      <>
        <GlobalCommentsHydrator
          comments={comments}
          documentTitles={documentTitles}
          mentionUsers={mentionUsers}
          fieldLabels={fieldLabels}
          collectionLabels={collectionLabels}
          globalLabels={globalLabels}
          loadError={false}
        />

        {children}
      </>
    );
  }

  return children;
}
