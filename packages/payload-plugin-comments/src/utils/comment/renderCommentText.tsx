import type { ReactNode } from "react";
import type { Comment, User } from "../../types";
import { MentionLabel } from "../../components/MentionLabel";
import { isSelfMention } from "../mention/isSelfMention";

const MENTION_SPLIT = /(@\(\d+\))/;
const MENTION_EXTRACT = /^@\((\d+)\)$/;

export function renderCommentText(
  text: string,
  mentions: Comment["mentions"],
  currentUserId?: number | null,
): ReactNode {
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
          const name = user ? user.name : "deleted user";
          const isSelf = isSelfMention(currentUserId, userId);

          return <MentionLabel key={i} name={name ?? "deleted user"} isSelf={isSelf} />;
        }

        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
