import type { CollectionBeforeChangeHook } from "payload";

import {
  FALLBACK_USERNAME,
  USERNAME_DEFAULT_FIELD_PATH,
} from "../../constants";
import type {
  CommentMention,
  CommentsPluginConfigStorage,
  User,
} from "../../types";
import { resolveUsername } from "../../utils/user/resolveUsername";

const extractUserId = (mention: CommentMention): number | null => {
  const {user} = mention;
  if (user && typeof user === "object" && "id" in user) {return Number(user.id);}
  if (typeof user === "number") {return user;}
  return null;
};

export const setMentionSnapshotsBeforeChange: CollectionBeforeChangeHook =
  async ({ data, originalDoc, req }) => {
    const mentions = Array.isArray(data?.mentions)
      ? (data.mentions as CommentMention[])
      : [];
    if (mentions.length === 0) {return data;}

    const pluginConfig = req.payload.config.admin?.custom?.commentsPlugin as
      | CommentsPluginConfigStorage
      | undefined;
    const usernameFieldPath =
      pluginConfig?.usernameFieldPath ?? USERNAME_DEFAULT_FIELD_PATH;

    const previousById = new Map<
      number,
      { userIdSnapshot?: number | null; displayNameSnapshot?: string | null }
    >();
    if (Array.isArray(originalDoc?.mentions)) {
      for (const m of originalDoc.mentions as CommentMention[]) {
        const uid = extractUserId(m);
        if (uid != null) {
          previousById.set(uid, {
            displayNameSnapshot: m.displayNameSnapshot,
            userIdSnapshot: m.userIdSnapshot,
          });
        }
      }
    }

    const idsToFetch: number[] = [];
    for (const m of mentions) {
      const uid = extractUserId(m);
      if (uid == null) {continue;}
      if (m.displayNameSnapshot != null) {continue;}
      if (previousById.get(uid)?.displayNameSnapshot != null) {continue;}
      idsToFetch.push(uid);
    }

    const userMap: Record<number, User> = {};
    if (idsToFetch.length > 0) {
      try {
        const userDocs = await req.payload.find({
          collection: "users",
          limit: idsToFetch.length,
          overrideAccess: true,
          select: { id: true, email: true, [usernameFieldPath]: true },
          where: { id: { in: idsToFetch } },
        });
        for (const user of userDocs.docs as User[]) {userMap[user.id] = user;}
      } catch (error) {
        req.payload.logger?.error?.(
          { error },
          "[comments] failed to resolve mention snapshots"
        );
      }
    }

    data.mentions = mentions.map((m) => {
      const uid = extractUserId(m);
      if (uid == null) {return m;}

      if (m.displayNameSnapshot != null) {
        return { ...m, userIdSnapshot: m.userIdSnapshot ?? uid };
      }

      const prev = previousById.get(uid);
      if (prev?.displayNameSnapshot != null) {
        return {
          ...m,
          displayNameSnapshot: prev.displayNameSnapshot,
          userIdSnapshot: prev.userIdSnapshot ?? uid,
        };
      }

      const user = userMap[uid];
      if (user) {
        return {
          ...m,
          displayNameSnapshot: resolveUsername(
            user,
            usernameFieldPath,
            FALLBACK_USERNAME
          ),
          userIdSnapshot: uid,
        };
      }

      return { ...m, userIdSnapshot: uid };
    });

    return data;
  };
