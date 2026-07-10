import { ButtonVariant } from "@/components/button/types";
import type { LinkProps } from "@/components/link/types";

import { shouldIncludeLocalePrefix } from "@/lib/utils/localePrefix";

interface PayloadLink {
  type?: "reference" | "custom" | null;
  url?: string | null;
  reference?: {
    relationTo: string;
    value: unknown;
  } | null;
  label?: string | null;
  appearance?: string | null;
  newTab?: boolean | null;
}

export function prepareLinkProps(link: PayloadLink | null | undefined, locale: string): LinkProps {
  if (!link) {
    return { href: "", text: "" };
  }

  let href = "";

  if (link.type === "custom" && link.url) {
    href = link.url;
  } else if (link.type === "reference" && link.reference) {
    const value = link.reference.value as Record<string, unknown>;
    if (typeof value === "object" && value !== null) {
      const breadcrumbs = (value.breadcrumbs as { url?: string }[]) ?? [];
      const path = breadcrumbs.at(-1)?.url ?? (value.slug as string) ?? "";
      href = shouldIncludeLocalePrefix(locale) ? `/${locale}${path}` : path;
    }
  }

  const variantMap: Record<string, ButtonVariant> = {
    accent: ButtonVariant.Accent,
    default: ButtonVariant.Primary,
    ghost: ButtonVariant.Ghost,
    link: ButtonVariant.Default,
    outline: ButtonVariant.Secondary,
  };

  return {
    href,
    text: link.label ?? "",
    variant: variantMap[link.appearance ?? ""] ?? ButtonVariant.Primary,
  };
}
