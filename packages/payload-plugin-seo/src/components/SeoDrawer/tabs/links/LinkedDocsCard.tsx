"use client";

import { useConfig, useLocale } from "@payloadcms/ui";
import { docTargetKey } from "../../../../keyphrases/docTarget";
import { adminDocHref } from "../../../../keyphrases/usage";
import type { UsageDoc } from "../../../../keyphrases/usage";
import { useSeoTranslation } from "../../../../translations/useSeoTranslation";
import { Pill } from "../../../../ui/Pill";
import { SectionCard } from "../../../../ui/SectionCard";
import { cn, ROW_SEPARATOR } from "../../../../utils/style";

export function LinkedDocsCard({ docs }: { docs: UsageDoc[] }) {
  const { config } = useConfig();
  const locale = useLocale();
  const { t } = useSeoTranslation();

  return (
    <SectionCard
      title={t("links.linkedTitle")}
      widget={<Pill variant="neutral">{docs.length}</Pill>}
    >
      <ul className="m-0 p-0 list-none">
        {docs.map((doc) => (
          <li
            className={cn("relative px-[15px] py-[10px]", ROW_SEPARATOR)}
            key={docTargetKey(doc.collection, doc.id)}
          >
            <a
              className="font-semibold text-[12.5px] text-neutral-800 underline"
              href={adminDocHref(config.routes.admin, doc, locale?.code)}
              rel="noopener noreferrer"
              target="_blank"
            >
              {doc.title}
            </a>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
