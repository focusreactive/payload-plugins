import { Footer as SharedFooter } from "./ui";
import type {
  FooterBadge,
  FooterLink,
  FooterLinkGroup,
  FooterSocialLink,
  IFooterProps,
} from "./ui/types";
import React from "react";

import { resolveLocale } from "@/lib/utils/resolveLocale";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import type { Footer as FooterType, Media } from "@/payload-types";

interface Props {
  data: FooterType;
}

type PayloadLink = NonNullable<NonNullable<FooterType["legalLinks"]>[number]["link"]>;

function resolveFooterLink(
  link: PayloadLink | null | undefined,
  locale: string
): FooterLink | undefined {
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

  const socialLinks: FooterSocialLink[] = (data.socialLinks ?? []).flatMap((entry) =>
    entry.platform && entry.url ? [{ platform: entry.platform, url: entry.url }] : []
  );

  const badges: FooterBadge[] = (data.isoBadges ?? []).map((badge) => ({
    certificate: badge.certificate ?? undefined,
    label: badge.label,
  }));

  const props: IFooterProps = {
    badges,
    brand: {
      href: "/",
      label: data.name ?? "",
      logo: logo ? prepareMediaProps({ image: logo }) : null,
    },
    copywriteText: data.copyrightText ?? undefined,
    description: data.description ?? undefined,
    legalLinks,
    linkGroups,
    socialLinks,
  };

  return <SharedFooter {...props} />;
}
