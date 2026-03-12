import type { ReactNode } from "react";
import type { Comment, User } from "../../types";
import { MentionLabel } from "../../components/MentionLabel";
import { isSelfMention } from "../mention/isSelfMention";
import { resolveUsername } from "../user/resolveUsername";
import { FALLBACK_DELETED_USERNAME } from "../../constants";

const MENTION_SPLIT = /(@\(\d+\))/;
const MENTION_EXTRACT = /^@\((\d+)\)$/;

interface Props {
  text: string;
  mentions: Comment["mentions"];
  currentUserId?: number | null;
  usernameFieldPath?: string;
  fallbackDeletedUsername?: string;
}

export function renderCommentText({
  text,
  mentions,
  currentUserId,
  usernameFieldPath,
  fallbackDeletedUsername,
}: Props): ReactNode {
  const userMap: Record<number, User> = {};

  if (Array.isArray(mentions)) {
    for (const mention of mentions) {
      const user = mention.user as User;

      userMap[user.id] = user;
    }
  }

  const parts = text.split(MENTION_SPLIT);

  return (
    <>
      {parts.map((part, i) => {
        const match = MENTION_EXTRACT.exec(part);

        if (match) {
          const userId = Number(match[1]);
          const user = userMap[userId];
          const isSelf = isSelfMention(currentUserId, userId);
          const name = resolveUsername(user, usernameFieldPath, fallbackDeletedUsername ?? FALLBACK_DELETED_USERNAME);

          return <MentionLabel key={i} name={name} isSelf={isSelf} />;
        }

        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
