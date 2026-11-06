"use client";

import { useConfig, useDebounce, usePayloadAPI } from "@payloadcms/ui";
import { AlertTriangle } from "lucide-react";
import { KEYPHRASE_USAGE_DELAY_MS, KEYPHRASE_USAGE_ENDPOINT_PATH } from "../../../../constants";
import { docTargetKey } from "../../../../keyphrases/docTarget";
import { adminDocHref, hasDocIdentity } from "../../../../keyphrases/usage";
import type { UsageDoc } from "../../../../keyphrases/usage";

export interface KeyphraseUsageProps {
  collectionSlug: string;
  docId: string;
  phrase: string;
}

export function KeyphraseUsageNotice({ collectionSlug, docId, phrase }: KeyphraseUsageProps) {
  const { config } = useConfig();
  const [{ data, isLoading, isError }] = usePayloadAPI(
    `${config.routes.api}${KEYPHRASE_USAGE_ENDPOINT_PATH}`,
    { initialParams: { collection: collectionSlug, docId, phrase } }
  );

  const docs: UsageDoc[] = Array.isArray(data?.docs) ? data.docs.filter(hasDocIdentity) : [];

  if (isLoading || isError || docs.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="text-[11.5px] text-seo-warn bg-seo-warn-100 rounded-rs px-[10px] py-[8px] flex items-start gap-[7px]"
      role="status"
    >
      <AlertTriangle aria-hidden="true" className="w-[15px] h-[15px] flex-none" />
      <div className="flex flex-col gap-[4px]">
        <span>This keyphrase is already used on:</span>
        <ul className="m-0 pl-[16px]">
          {docs.map((doc) => (
            <li key={docTargetKey(doc.collection, doc.id)}>
              <a
                className="text-inherit underline"
                href={adminDocHref(config.routes.admin, doc)}
                rel="noopener noreferrer"
                target="_blank"
              >
                {doc.title}
              </a>
            </li>
          ))}
        </ul>
        <span>
          Pages that target one keyphrase can compete in search. Pick a different keyphrase or link
          the pages to each other.
        </span>
      </div>
    </div>
  );
}

export function KeyphraseUsage({ collectionSlug, docId, phrase }: KeyphraseUsageProps) {
  const debounced = useDebounce(phrase.trim(), KEYPHRASE_USAGE_DELAY_MS);

  if (!debounced) return null;

  return (
    <KeyphraseUsageNotice
      collectionSlug={collectionSlug}
      docId={docId}
      key={debounced}
      phrase={debounced}
    />
  );
}
