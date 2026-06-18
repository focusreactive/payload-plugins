import { Resend } from "resend";
import { getServerSideURL } from "../utils/general/getURL";
import type { BaseServiceOptions, CommentsPluginConfigStorage, User } from "../types";
import { extractPayload } from "../utils/payload/extractPayload";
import { FALLBACK_USERNAME, PLUGIN_NAME, USERNAME_DEFAULT_FIELD_PATH } from "../constants";

const PREFIX = `[${PLUGIN_NAME}]`;

interface SendMentionEmailsProps extends BaseServiceOptions {
  mentionIds: number[];
  authorName: string;
  commentText: string;
  collectionSlug: string;
  documentId: number | null | undefined;
}

export async function sendMentionEmails({ mentionIds, authorName, commentText, collectionSlug, documentId, payload: payloadProp }: SendMentionEmailsProps) {
  const payload = await extractPayload(payloadProp);

  const pluginConfig = payload.config.admin?.custom?.commentsPlugin as CommentsPluginConfigStorage | undefined;
  const usernameFieldPath = pluginConfig?.usernameFieldPath ?? USERNAME_DEFAULT_FIELD_PATH;

  const userDocs = await payload.find({
    collection: "users",
    overrideAccess: true,
    limit: mentionIds.length,
    where: {
      id: { in: mentionIds },
    },
    select: {
      id: true,
      email: true,
      [usernameFieldPath]: true,
    },
  });

  const users = userDocs.docs as User[];

  const userMap: Record<number, string> = {};
  for (const user of users) {
    const { id, email } = user;
    const name = user[usernameFieldPath] as string;
    userMap[id] = name ?? email ?? FALLBACK_USERNAME;
  }

  const resolvedText = commentText.replace(/@\((\d+)\)/g, (_match, id) => {
    return `@${userMap[Number(id)]}`;
  });

  const resolvedTextHtml = commentText.replace(/@\((\d+)\)/g, (_match, id) => {
    return `@<strong>${userMap[Number(id)]}</strong>`;
  });

  const adminUrl = `${getServerSideURL()}/admin/collections/${collectionSlug}/${documentId}`;

  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    const missingVar = !apiKey ? "RESEND_API_KEY" : "RESEND_FROM_EMAIL";
    console.warn(`${PREFIX} Mention emails disabled: ${missingVar} not set. Comments still work; @mention notifications won't be sent.`);

    return;
  }

  const resend = new Resend(apiKey);

  for (const u of users) {
    if (!u.email) continue;

    try {
      await resend.emails.send({
        from: fromEmail,
        to: u.email,
        subject: `${authorName} mentioned you in a comment`,
        text: `${authorName} mentioned you in a comment:\n\n"${resolvedText}"\n\nView document: ${adminUrl}`,
        html: `<p>${authorName} mentioned you in a comment:</p><blockquote>${resolvedTextHtml}</blockquote><p>View document: <a href="${adminUrl}">${adminUrl}</a></p>`,
      });
    } catch (err) {
      console.error(`[sendMentionEmails] Failed to send email to user ${u.id}:`, err);
    }
  }
}
