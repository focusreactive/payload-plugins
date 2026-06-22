import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import React from "react";

import { BLOG_CONFIG } from "@/lib/config/blog";
import { cn } from "@/components/utils";
import { Button, ButtonVariant } from "@/components/button";
import { Link } from "@/components/shared";
import type { LinkAppearances } from "@/lib/fields/link";
import type { Page, Post } from "@/payload-types";

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

const collectionPaths: Record<string, string> = {
  page: "",
  posts: BLOG_CONFIG.basePath,
};

interface Props {
  appearance?:
    | VariantProps<typeof linkVariants>["appearance"]
    | ButtonProps["variant"]
    | LinkAppearances
    | null;
  children?: React.ReactNode;
  className?: string;
  label?: string | null;
  newTab?: boolean | null;
  onClick?: React.MouseEventHandler<HTMLElement>;
  reference?: {
    relationTo: "page" | "posts";
    value: Page | Post | string | number;
  } | null;
  size?: ButtonProps["size"] | null;
  type?: "custom" | "reference" | "customPage" | null;
  url?: string | null;
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

export const CMSLink: React.FC<Props> = (props) => {
  const {
    type,
    appearance = "inline",
    children,
    className,
    label,
    newTab,
    onClick,
    reference,
    size,
    url,
  } = props;

  const href =
    type === "reference" && typeof reference?.value === "object" && reference.value.slug
      ? `${collectionPaths[reference.relationTo]}/${reference.value.slug}`
      : url;

  if (!href) {
    return null;
  }

  const newTabProps = newTab ? { rel: "noopener noreferrer", target: "_blank" } : {};

  const isInline = appearance === "inline" || !appearance;

  const hrefToUse = (href || url) === "/home" ? "/" : href || url || "";

  /* Ensure we don't break any styles set by richText */
  if (isInline) {
    return (
      <Link
        className={cn(linkVariants({ appearance: "inline" }), className)}
        href={hrefToUse}
        onClick={onClick}
        {...newTabProps}
      >
        {label}
        {children}
      </Link>
    );
  }

  return (
    <Button asChild className={className} size={size} variant={mapAppearanceToVariant(appearance)}>
      <Link href={href || url || ""} onClick={onClick} {...newTabProps}>
        {label}
        {children}
      </Link>
    </Button>
  );
};
