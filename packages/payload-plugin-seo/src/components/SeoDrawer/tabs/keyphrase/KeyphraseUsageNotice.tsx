"use client";

import { useConfig, useDebounce, usePayloadAPI } from "@payloadcms/ui";
import { useEffect } from "react";
import { KEYPHRASE_USAGE_DELAY_MS, KEYPHRASE_USAGE_ENDPOINT_PATH } from "../../../../constants";
import { docTargetKey } from "../../../../keyphrases/docTarget";
import { adminDocHref, hasDocIdentity } from "../../../../keyphrases/usage";
import type { UsageDoc } from "../../../../keyphrases/usage";
import { useSeoTranslation } from "../../../../translations/useSeoTranslation";
import { Notice } from "../../../../ui/Notice";

export interface KeyphraseUsageProps {
  collectionSlug: string;
  docId: string;
  phrase: string;
}

export function KeyphraseUsageNotice({ collectionSlug, docId, phrase }: KeyphraseUsageProps) {
  const { config } = useConfig();
  const { t } = useSeoTranslation();
  const [{ data, isError }, { setParams }] = usePayloadAPI(
    `${config.routes.api}${KEYPHRASE_USAGE_ENDPOINT_PATH}`,
    { initialParams: { collection: collectionSlug, docId, phrase } }
  );

  useEffect(() => {
    setParams({ collection: collectionSlug, docId, phrase });
  }, [collectionSlug, docId, phrase, setParams]);

  const docs: UsageDoc[] = Array.isArray(data?.docs) ? data.docs.filter(hasDocIdentity) : [];

  if (isError || docs.length === 0) return null;

  return (
    <Notice aria-live="polite" role="status" variant="warn">
      <div className="flex flex-col gap-[4px]">
        <span>{t("keyphrase.usedOn")}</span>
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
        <span>{t("keyphrase.cannibalization")}</span>
      </div>
    </Notice>
  );
}

export function KeyphraseUsage({ collectionSlug, docId, phrase }: KeyphraseUsageProps) {
  const debounced = useDebounce(phrase.trim(), KEYPHRASE_USAGE_DELAY_MS);

  if (!debounced) return null;

  return <KeyphraseUsageNotice collectionSlug={collectionSlug} docId={docId} phrase={debounced} />;
}
