import React from "react";

import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Footer as FooterType } from "@/payload-types";
import { WbFooter } from "@/components/wb/WbFooter";
import type { WbFooterColumn } from "@/components/wb/WbFooter";

interface Props {
  data: FooterType;
}

export async function Footer({ data }: Props) {
  if (!data) {
    return null;
  }

  const locale = await resolveLocale();

  const columns: WbFooterColumn[] = (data.linkGroups ?? []).map((group) => ({
    title: group.label,
    links: (group.links ?? []).flatMap((entry) => {
      const href = prepareLinkProps(entry.link, locale).href;
      const label = entry.link?.label;
      return label && href ? [{ label, href }] : [];
    }),
  }));

  return (
    <WbFooter
      description={data.description ?? undefined}
      columns={columns}
      contact={{
        companyName: data.contact?.companyName ?? undefined,
        address: data.contact?.address ?? undefined,
        phoneLabel: data.contact?.phoneLabel ?? undefined,
        phone: data.contact?.phone ?? undefined,
      }}
      newsletter={{
        heading: data.newsletter?.heading ?? undefined,
        placeholder: data.newsletter?.placeholder ?? undefined,
        submitLabel: data.newsletter?.submitLabel ?? undefined,
      }}
      copyright={data.copyrightText ?? undefined}
    />
  );
}
