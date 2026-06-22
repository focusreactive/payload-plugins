import { Footer as SharedFooter } from "@/components/ui";
import type { FooterLink, FooterLinkGroup, IFooterProps } from "@/components/ui/sections/footer/types";
import React from "react";

import { resolveLocale } from "@/core/lib/resolveLocale";
import { prepareImageProps } from "@/lib/adapters/prepareImageProps";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import type { Footer as FooterType, Media } from "@/payload-types";

interface Props {
  data: FooterType;
}

type PayloadLink = NonNullable<NonNullable<FooterType["legalLinks"]>[number]["link"]>;

function resolveFooterLink(link: PayloadLink | null | undefined, locale: string): FooterLink | undefined {
  if (!link) {
    return undefined;
  }

  const { href } = prepareLinkProps(link, locale);

  if (!href) {
    return undefined;
  }

  return {
    href,
    label: link.label ?? "",
    newTab: link.newTab ?? false,
  };
}

export async function Footer({ data }: Props) {
  if (!data) {
    return null;
  }

  const locale = await resolveLocale();

  const logo: Media | null = typeof data.logo === "object" ? data.logo : null;

  const linkGroups: FooterLinkGroup[] = (data.linkGroups ?? []).map((group) => ({
    label: group.label,
    links: (group.links ?? []).flatMap((entry) => {
      const resolved = resolveFooterLink(entry.link, locale);
      return resolved ? [resolved] : [];
    }),
  }));

  const legalLinks: FooterLink[] = (data.legalLinks ?? []).flatMap((entry) => {
    const resolved = resolveFooterLink(entry.link, locale);
    return resolved ? [resolved] : [];
  });

  const props: IFooterProps = {
    brand: {
      href: "/",
      label: data.name ?? "",
      logo: logo ? prepareImageProps({ image: logo }) : null,
    },
    copywriteText: data.copywriteText ?? undefined,
    description: data.description ?? undefined,
    legalLinks,
    linkGroups,
  };

  return <SharedFooter {...props} />;
}
