import { findAllComments } from "../../services/findAllComments";
import { getDocumentTitles } from "../../services/getDocumentTitles";
import { fetchMentionableUsers } from "../../services/fetchMentionableUsers";
import { fetchFieldLabels } from "../../services/fieldLabels/fetchFieldLabels";
import { getCollectionLabels } from "../../services/getCollectionLabels";
import { setPayloadConfig } from "../../config";
import { GlobalCommentsHydrator } from "./GlobalCommentsHydrator";
import type { Payload } from "payload";
import type { ReactNode } from "react";
import type { CommentsPluginConfigStorage } from "../../types";

interface Props {
  children: ReactNode;
  payload: Payload;
  locale?: string;
}

export async function GlobalCommentsLoader({ children, payload, locale }: Props) {
  setPayloadConfig(payload.config);

  const pluginConfig = payload?.config.admin?.custom?.commentsPlugin as CommentsPluginConfigStorage | undefined;

  const commentsResult = await findAllComments({
    enabledCollections: pluginConfig?.collections,
    options: { payload },
  });

  const comments = commentsResult.success ? commentsResult.data : [];

  const [titlesResult, mentionUsersResult, fieldLabels] = await Promise.all([
    getDocumentTitles(comments, pluginConfig?.documentTitleFields ?? {}, { payload, locale }),
    fetchMentionableUsers({ payload }),
    fetchFieldLabels(comments, { payload }),
  ]);

  const collectionLabels = getCollectionLabels(payload, pluginConfig?.collections ?? []);

  return (
    <>
      <GlobalCommentsHydrator
        comments={comments}
        documentTitles={titlesResult.success ? titlesResult.data : {}}
        mentionUsers={mentionUsersResult.success ? mentionUsersResult.data : []}
        fieldLabels={fieldLabels}
        collectionLabels={collectionLabels}
        loadError={!commentsResult.success}
      />

      {children}
    </>
  );
}
