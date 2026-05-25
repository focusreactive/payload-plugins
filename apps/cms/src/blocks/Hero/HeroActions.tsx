"use client";

import {
  resolveAbCookieNames,
  useABConversion,
} from "@focus-reactive/payload-plugin-ab/analytics/client";
import { useParams } from "next/navigation";
import React from "react";

import { abCookies } from "@/core/lib/abTesting/abCookies";
import { manifestKeyToExpId } from "@/core/lib/abTesting/cookieName";
import { CMSLink } from "@/core/ui";
import type { HeroBlock } from "@/payload-types";

type Action = NonNullable<HeroBlock["actions"]>[number];

export function HeroActions({ actions }: { actions: Action[] }) {
  const { locale, slug } = useParams<{
    locale?: string;
    slug?: string[];
  }>();

  const slugPath =
    Array.isArray(slug) && slug.length ? `/${  slug.join("/")}` : "";
  const experimentId = locale
    ? manifestKeyToExpId(`/${locale}${slugPath}`)
    : "";
  const cookieNames = resolveAbCookieNames(abCookies, experimentId);

  const trackConversion = useABConversion({ experimentId, ...cookieNames });

  return (
    <ul className="flex gap-4 flex-wrap">
      {actions.map((action, i) => (
        <li key={i}>
          <CMSLink
            {...action}
            onClick={() => trackConversion({ goalId: "hero_cta_click" })}
          />
        </li>
      ))}
    </ul>
  );
}
