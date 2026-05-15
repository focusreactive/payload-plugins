import { Resend } from "resend";

import { FALLBACK_USERNAME, USERNAME_DEFAULT_FIELD_PATH } from "../constants";
import type {
  BaseServiceOptions,
  CommentsPluginConfigStorage,
  User,
} from "../types";
import { getServerSideURL } from "../utils/general/getURL";
import { extractPayload } from "../utils/payload/extractPayload";

interface SendMentionEmailsProps extends BaseServiceOptions {
  mentionIds: number[];
  authorName: string;
  commentText: string;
  collectionSlug: string;
  documentId: number | null | undefined;
}

export async function sendMentionEmails({
  mentionIds,
  authorName,
  commentText,
  collectionSlug,
  documentId,
  payload: payloadProp,
}: SendMentionEmailsProps) {
  const payload = await extractPayload(payloadProp);

  const pluginConfig = payload.config.admin?.custom?.commentsPlugin as
    | CommentsPluginConfigStorage
    | undefined;
  const usernameFieldPath =
    pluginConfig?.usernameFieldPath ?? USERNAME_DEFAULT_FIELD_PATH;

  const userDocs = await payload.find({
    collection: "users",
    limit: mentionIds.length,
    overrideAccess: true,
    select: {
      id: true,
      email: true,
      [usernameFieldPath]: true,
    },
    where: {
      id: { in: mentionIds },
    },
  });

  const users = userDocs.docs as User[];

  const userMap: Record<number, string> = {};
  for (const user of users) {
    const { id, email } = user;
    const name = user[usernameFieldPath] as string;
    userMap[id] = name ?? email ?? FALLBACK_USERNAME;
  }

  const resolvedText = commentText.replaceAll(/@\((\d+)\)/g, (_match, id) => `@${userMap[Number(id)]}`);

  const resolvedTextHtml = commentText.replaceAll(/@\((\d+)\)/g, (_match, id) => `@<strong>${userMap[Number(id)]}</strong>`);

  const adminUrl = `${getServerSideURL()}/admin/collections/${collectionSlug}/${documentId}`;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!fromEmail) {
    console.error(
      `[sendMentionEmails] fromEmail parameter wasn't provided. Use RESEND_FROM_EMAIL env to set up fromEmail`
    );

    return;
  }

  for (const u of users) {
    if (!u.email) {continue;}

    try {
      await resend.emails.send({
        from: fromEmail,
        html: `<p>${authorName} mentioned you in a comment:</p><blockquote>${resolvedTextHtml}</blockquote><p>View document: <a href="${adminUrl}">${adminUrl}</a></p>`,
        subject: `${authorName} mentioned you in a comment`,
        text: `${authorName} mentioned you in a comment:\n\n"${resolvedText}"\n\nView document: ${adminUrl}`,
        to: u.email,
      });
    } catch (error) {
      console.error(
        `[sendMentionEmails] Failed to send email to user ${u.id}:`,
        error
      );
    }
  }
}
