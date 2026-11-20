import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import React from "react";

import { cn } from "@/components/utils";
import { Button, ButtonVariant } from "@/components/button";
import { Link } from "@/components/shared";
import type { LinkFieldValue } from "@/lib/adapters/prepareLinkProps";
import { I18N_CONFIG } from "@/lib/config/i18n";
import { CUSTOM_PAGES_CONFIG } from "@/lib/config/customPages";
import type { CustomPageKey } from "@/lib/config/customPages";
import { getDocumentPath } from "@/lib/utils/path/getDocumentPath";
import type { LinkAppearances } from "@/lib/fields/link";

type ButtonProps = React.ComponentProps<typeof Button>;

const linkVariants = cva("transition-all", {
  defaultVariants: {
    appearance: "inline",
  },
  variants: {
    appearance: {
      inline: "text-primary underline-offset-4",
    },
  },
});

interface Props {
  /** Overrides the link's own "Button style"; without either the link renders inline. */
  appearance?:
    | VariantProps<typeof linkVariants>["appearance"]
    | ButtonProps["variant"]
    | LinkAppearances
    | null;
  children?: React.ReactNode;
  className?: string;
  /** The stored value of a standard `link` field. */
  link: LinkFieldValue | null | undefined;
  onClick?: React.MouseEventHandler<HTMLElement>;
  size?: ButtonProps["size"] | null;
}

const fieldAppearanceToVariant: Record<LinkAppearances, ButtonVariant> = {
  accent: ButtonVariant.Accent,
  default: ButtonVariant.Primary,
  ghost: ButtonVariant.Ghost,
  link: ButtonVariant.Default,
  outline: ButtonVariant.Secondary,
};

function mapAppearanceToVariant(appearance: Props["appearance"]): ButtonProps["variant"] {
  if (appearance && appearance in fieldAppearanceToVariant) {
    return fieldAppearanceToVariant[appearance as LinkAppearances];
  }
  return appearance as ButtonProps["variant"];
}

/**
 * The link's path without a locale prefix: the locale-aware `Link` adds the visitor's locale.
 * Built-in pages resolve for the default locale, which carries no prefix.
 */
function resolveUnprefixedHref(link: LinkFieldValue): string | undefined {
  switch (link.type) {
    case "reference":
      return link.reference ? getDocumentPath(link.reference) : undefined;
    case "customPage": {
      const entry = link.customPage
        ? CUSTOM_PAGES_CONFIG[link.customPage as CustomPageKey]
        : undefined;
      return entry?.resolver(I18N_CONFIG.defaultLocale);
    }
    case "custom":
      return link.url ?? undefined;
    default:
      return undefined;
  }
}

export const CMSLink: React.FC<Props> = ({
  appearance,
  children,
  className,
  link,
  onClick,
  size,
}) => {
  const href = link ? resolveUnprefixedHref(link) : undefined;

  if (!link || !href) {
    return null;
  }

  const newTabProps = link.newTab ? { rel: "noopener noreferrer", target: "_blank" } : {};
  const appearanceToUse: Props["appearance"] =
    appearance ?? (link.appearance as LinkAppearances | null | undefined) ?? "inline";
  const hrefToUse = href === "/home" ? "/" : href;

  /* Ensure we don't break any styles set by richText */
  if (appearanceToUse === "inline") {
    return (
      <Link
        className={cn(linkVariants({ appearance: "inline" }), className)}
        href={hrefToUse}
        onClick={onClick}
        {...newTabProps}
      >
        {link.label}
        {children}
      </Link>
    );
  }

  return (
    <Button
      asChild
      className={className}
      size={size}
      variant={mapAppearanceToVariant(appearanceToUse)}
    >
      <Link href={hrefToUse} onClick={onClick} {...newTabProps}>
        {link.label}
        {children}
      </Link>
    </Button>
  );
};
