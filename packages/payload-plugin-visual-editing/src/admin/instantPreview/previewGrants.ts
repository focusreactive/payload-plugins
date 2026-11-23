import type { VeDocument, VePreviewGrantMessage } from "../../shared/protocol.js";

import { isPlainObject } from "../../shared/plainObject.js";
import { VE_PREVIEW_GRANT_PATH, VE_PREVIEW_GRANT_TYPE } from "../../shared/protocol.js";

export const GRANT_RENEWAL_MARGIN_MS = 2 * 60 * 1000;

export const GRANT_RENEWAL_INTERVAL_MS = 4 * 60 * 1000;

export type FetchGrant = (document: VeDocument) => Promise<unknown>;

export type GrantedPage = { pageId: string; asksForGrant: boolean };

export interface PreviewGrants {
  current(document: VeDocument): Promise<VePreviewGrantMessage | null>;
  forPage(document: VeDocument, page: GrantedPage): Promise<VePreviewGrantMessage | null>;
}

const grantMessageOf = (answer: unknown): VePreviewGrantMessage | null => {
  if (!isPlainObject(answer)) return null;
  const { expiresAt, grant } = answer;
  return typeof grant === "string" && typeof expiresAt === "number"
    ? { expiresAt, grant, type: VE_PREVIEW_GRANT_TYPE }
    : null;
};

const askedFor = async (
  fetchGrant: FetchGrant,
  document: VeDocument
): Promise<VePreviewGrantMessage | null> => {
  try {
    return grantMessageOf(await fetchGrant(document));
  } catch {
    return null;
  }
};

export function createPreviewGrants(fetchGrant: FetchGrant, now = Date.now): PreviewGrants {
  let held: { address: string; message: Promise<VePreviewGrantMessage | null> } | null = null;

  let sent: { grant: string; pageId: string } | null = null;

  const isFresh = (message: VePreviewGrantMessage | null) =>
    Boolean(message && message.expiresAt - GRANT_RENEWAL_MARGIN_MS > now());

  const current: PreviewGrants["current"] = async (document) => {
    const address = JSON.stringify(document);
    if (held?.address === address && isFresh(await held.message)) return held.message;
    const message = askedFor(fetchGrant, document);
    held = { address, message };
    return message;
  };

  return {
    current,
    async forPage(document, { asksForGrant, pageId }) {
      const message = await current(document);
      if (!message) return null;
      const hasIt = sent?.grant === message.grant && sent.pageId === pageId;
      if (hasIt && !asksForGrant) return null;
      sent = { grant: message.grant, pageId };
      return message;
    },
  };
}

export const fetchGrantFrom =
  (apiUrl: string): FetchGrant =>
  async (document) => {
    const response = await fetch(`${apiUrl}${VE_PREVIEW_GRANT_PATH}`, {
      body: JSON.stringify(document),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
    return response.ok ? response.json() : null;
  };
