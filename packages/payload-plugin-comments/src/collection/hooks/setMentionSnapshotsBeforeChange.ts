import type { CollectionBeforeChangeHook } from "payload";
import { FALLBACK_USERNAME, USERNAME_DEFAULT_FIELD_PATH } from "../../constants";
import type { CommentMention, CommentsPluginConfigStorage, User } from "../../types";
import { resolveUsername } from "../../utils/user/resolveUsername";

const extractUserId = (mention: CommentMention): number | null => {
  const user = mention.user;
  if (user && typeof user === "object" && "id" in user) return Number(user.id);
  if (typeof user === "number") return user;
  return null;
};

export const setMentionSnapshotsBeforeChange: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  const mentions = Array.isArray(data?.mentions) ? (data.mentions as CommentMention[]) : [];
  if (mentions.length === 0) return data;

  const pluginConfig = req.payload.config.admin?.custom?.commentsPlugin as CommentsPluginConfigStorage | undefined;
  const usernameFieldPath = pluginConfig?.usernameFieldPath ?? USERNAME_DEFAULT_FIELD_PATH;

  const previousById = new Map<number, { userIdSnapshot?: number | null; displayNameSnapshot?: string | null }>();
  if (Array.isArray(originalDoc?.mentions)) {
    for (const m of originalDoc.mentions as CommentMention[]) {
      const uid = extractUserId(m);
      if (uid != null) {
        previousById.set(uid, { userIdSnapshot: m.userIdSnapshot, displayNameSnapshot: m.displayNameSnapshot });
      }
    }
  }

  const idsToFetch: number[] = [];
  for (const m of mentions) {
    const uid = extractUserId(m);
    if (uid == null) continue;
    if (m.displayNameSnapshot != null) continue;
    if (previousById.get(uid)?.displayNameSnapshot != null) continue;
    idsToFetch.push(uid);
  }

  const userMap: Record<number, User> = {};
  if (idsToFetch.length > 0) {
    try {
      const userDocs = await req.payload.find({
        collection: "users",
        overrideAccess: true,
        limit: idsToFetch.length,
        where: { id: { in: idsToFetch } },
        select: { id: true, email: true, [usernameFieldPath]: true },
      });
      for (const user of userDocs.docs as User[]) userMap[user.id] = user;
    } catch (err) {
      req.payload.logger?.error?.({ err }, "[comments] failed to resolve mention snapshots");
    }
  }

  data.mentions = mentions.map((m) => {
    const uid = extractUserId(m);
    if (uid == null) return m;

    if (m.displayNameSnapshot != null) {
      return { ...m, userIdSnapshot: m.userIdSnapshot ?? uid };
    }

    const prev = previousById.get(uid);
    if (prev?.displayNameSnapshot != null) {
      return { ...m, userIdSnapshot: prev.userIdSnapshot ?? uid, displayNameSnapshot: prev.displayNameSnapshot };
    }

    const user = userMap[uid];
    if (user) {
      return {
        ...m,
        userIdSnapshot: uid,
        displayNameSnapshot: resolveUsername(user, usernameFieldPath, FALLBACK_USERNAME),
      };
    }

    return { ...m, userIdSnapshot: uid };
  });

  return data;
};
