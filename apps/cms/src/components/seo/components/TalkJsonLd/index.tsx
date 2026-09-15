import React from "react";

import { createTalkSchema } from "@/components/seo/schemas";
import type { TalkTier } from "@/lib/talks/applyTier";
import type { Locale } from "@/lib/types";
import type { Talk } from "@/payload-types";

import { JsonLd } from "../JsonLd";

interface TalkJsonLdProps {
  talk: Talk;
  requiredTier: TalkTier;
  siteName?: string;
  locale: Locale;
}

export function TalkJsonLd({ talk, requiredTier, siteName, locale }: TalkJsonLdProps) {
  const structuredData = createTalkSchema({ locale, requiredTier, siteName, talk });
  return <JsonLd data={structuredData} />;
}
