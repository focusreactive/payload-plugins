import type { ReactNode } from "react";
import type { Comment, User } from "../../types";
import { MentionLabel } from "../../components/MentionLabel";
import { isSelfMention } from "../mention/isSelfMention";
import { resolveUsername } from "../user/resolveUsername";
import { FALLBACK_DELETED_USERNAME } from "../../constants";

const MENTION_SPLIT = /(@\(\d+\))/;
const MENTION_EXTRACT = /^@\((\d+)\)$/;

interface MentionRecord {
  user: User | null;
  displayNameSnapshot: string | null;
}

interface Props {
  text: string;
  mentions: Comment["mentions"];
  currentUserId?: number | null;
  usernameFieldPath?: string;
  fallbackDeletedUsername?: string;
  mentionDeletedSuffix?: string;
}

export function renderCommentText({
  text,
  mentions,
  currentUserId,
  usernameFieldPath,
  fallbackDeletedUsername,
  mentionDeletedSuffix,
}: Props): ReactNode {
  const mentionMap: Record<number, MentionRecord> = {};

  if (Array.isArray(mentions)) {
    for (const mention of mentions) {
      const userObj = mention.user && typeof mention.user === "object" ? (mention.user as User) : null;
      const id = userObj?.id ?? mention.userIdSnapshot ?? null;
      if (id == null) continue;
      mentionMap[id] = {
        user: userObj,
        displayNameSnapshot: mention.displayNameSnapshot ?? null,
      };
    }
  }

  const fallbackDeleted = fallbackDeletedUsername ?? FALLBACK_DELETED_USERNAME;
  const parts = text.split(MENTION_SPLIT);

  return (
    <>
      {parts.map((part, i) => {
        const match = MENTION_EXTRACT.exec(part);

        if (match) {
          const userId = Number(match[1]);
          const record = mentionMap[userId];
          const user = record?.user ?? null;
          const isSelf = isSelfMention(currentUserId, userId);
          const isDeleted = !user;
          const name =
            user ?
              resolveUsername(user, usernameFieldPath, fallbackDeleted)
            : (record?.displayNameSnapshot ?? fallbackDeleted);

          return (
            <MentionLabel
              key={i}
              name={name}
              isSelf={isSelf}
              isDeleted={isDeleted}
              deletedSuffix={mentionDeletedSuffix}
            />
          );
        }

        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
