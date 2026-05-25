import { ButtonVariant } from "@repo/ui/components/ui/button/types";
import type { LinkProps } from "@repo/ui/components/ui/link/types";

import { CUSTOM_PAGES_CONFIG } from '@/core/config/customPages';
import type { CustomPageKey } from '@/core/config/customPages';
import { shouldIncludeLocalePrefix } from "@/core/lib/localePrefix";

interface PayloadLink {
  type?: "reference" | "custom" | "customPage" | null;
  url?: string | null;
  reference?: {
    relationTo: string;
    value: unknown;
  } | null;
  customPage?: string | null;
  label?: string | null;
  appearance?: string | null;
  newTab?: boolean | null;
}

export function prepareLinkProps(
  link: PayloadLink | null | undefined,
  locale: string
): LinkProps {
  if (!link) {return { text: "", href: "" };}

  let href = "";

  if (link.type === "custom" && link.url) {
    href = link.url;
  } else if (link.type === "reference" && link.reference) {
    const value = link.reference.value as Record<string, unknown>;
    if (typeof value === "object" && value !== null) {
      const breadcrumbs = (value.breadcrumbs as { url?: string }[]) ?? [];
      const path =
        breadcrumbs.at(-1)?.url ??
        (value.slug as string) ??
        "";
      href = shouldIncludeLocalePrefix(locale) ? `/${locale}${path}` : path;
    }
  } else if (link.type === "customPage" && link.customPage) {
    const entry = CUSTOM_PAGES_CONFIG[link.customPage as CustomPageKey];

    if (entry) {href = entry.resolver(locale);}
  }

  const variantMap: Record<string, ButtonVariant> = {
    outline: ButtonVariant.Secondary,
  };

  return {
    href,
    text: link.label ?? "",
    variant: variantMap[link.appearance ?? ""] ?? ButtonVariant.Default,
  };
}
