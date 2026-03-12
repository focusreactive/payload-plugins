import { Resend } from "resend";
import { getServerSideURL } from "../utils/general/getURL";
import type { BaseServiceOptions, User } from "../types";
import { extractPayload } from "../utils/payload/extractPayload";

interface SendMentionEmailsProps extends BaseServiceOptions {
  mentionIds: number[];
  authorName: string;
  commentText: string;
  collectionSlug: string;
  documentId: number;
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

  const userDocs = await payload.find({
    collection: "users",
    overrideAccess: true,
    limit: mentionIds.length,
    where: {
      id: { in: mentionIds },
    },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  const users = userDocs.docs as User[];

  const userMap: Record<number, string> = {};
  for (const { id, name, email } of users) {
    userMap[Number(id)] = name ?? email ?? "Unknown";
  }

  const resolvedText = commentText.replace(/@\((\d+)\)/g, (_match, id) => {
    return `@${userMap[Number(id)] ?? "Unknown"}`;
  });

  const resolvedTextHtml = commentText.replace(/@\((\d+)\)/g, (_match, id) => {
    return `@<strong>${userMap[Number(id)] ?? "Unknown"}</strong>`;
  });

  const adminUrl = `${getServerSideURL()}/admin/collections/${collectionSlug}/${documentId}`;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!fromEmail) {
    console.error(
      `[sendMentionEmails] fromEmail parameter wasn't provided. Use RESEND_FROM_EMAIL env to set up fromEmail`,
    );

    return;
  }

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
