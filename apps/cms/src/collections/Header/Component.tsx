import React from "react";

import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { Header as HeaderType } from "@/payload-types";
import { WbHeader } from "@/components/wb/WbHeader";
import type { WbHeaderNavItem } from "@/components/wb/WbHeader";

interface Props {
  data: HeaderType;
}

export async function Header({ data }: Props) {
  if (!data) {
    return null;
  }

  const locale = await resolveLocale();

  const navItems: WbHeaderNavItem[] = (data.navItems ?? []).flatMap((item) => {
    const href = prepareLinkProps(item.link, locale).href;
    if (!(item.label && href)) {
      return [];
    }
    return [{ label: item.label, href }];
  });

  const firstAction = data.actions?.[0];
  const subscribeHref = firstAction ? prepareLinkProps(firstAction, locale).href : "";
  const subscribe =
    firstAction?.label && subscribeHref
      ? { label: firstAction.label, href: subscribeHref }
      : undefined;

  return <WbHeader tagline={data.tagline ?? undefined} navItems={navItems} subscribe={subscribe} />;
}
