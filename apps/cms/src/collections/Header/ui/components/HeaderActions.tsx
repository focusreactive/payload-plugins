import NextLink from "next/link";

import { cn } from "@/components/utils";
import { ButtonVariant } from "@/components/button/types";
import type { HeaderAction } from "../types";

interface HeaderActionsProps {
  actions: HeaderAction[];
  fullWidth?: boolean;
  onNavigate?: () => void;
}

/**
 * Styled here rather than through the shared Button because every one of its variants is a pill at
 * font-semibold, and this design is a 12px rectangle at weight 500 with no bold anywhere.
 */
const actionClassName =
  "inline-flex h-[clamp(40px,3.4vw,46px)] items-center whitespace-nowrap rounded-lg px-[clamp(14px,1.7vw,24px)] text-small font-medium transition-colors duration-[250ms] ease-[ease] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none";

const primaryActionClassName = "bg-primary text-primary-foreground hover:bg-primary-hover";

/** The design shows one action; a second one borrows the cart control's outline so it recedes. */
const secondaryActionClassName =
  "border border-border bg-surface text-foreground hover:border-primary hover:bg-surface-muted";

function isPrimary(variant: ButtonVariant): boolean {
  return variant === ButtonVariant.Accent || variant === ButtonVariant.Primary;
}

export function HeaderActions({ actions, fullWidth, onNavigate }: HeaderActionsProps) {
  return (
    <>
      {actions.map((action, index) => {
        const newTabProps = action.newTab ? { rel: "noopener noreferrer", target: "_blank" } : {};

        return (
          <NextLink
            key={`${action.label}-${index}`}
            href={action.href}
            onClick={onNavigate}
            className={cn(
              actionClassName,
              isPrimary(action.variant) ? primaryActionClassName : secondaryActionClassName,
              fullWidth && "w-full justify-center"
            )}
            {...newTabProps}
          >
            {action.label}
          </NextLink>
        );
      })}
    </>
  );
}
