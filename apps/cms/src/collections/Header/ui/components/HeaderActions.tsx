import NextLink from "next/link";

import { Button } from "@/components/ui/primitives/button";
import { ButtonSize, ButtonVariant } from "@/components/ui/primitives/button/types";
import type { HeaderAction } from "../types";

interface HeaderActionsProps {
  actions: HeaderAction[];
}

export function HeaderActions({ actions }: HeaderActionsProps) {
  return (
    <>
      {actions.map((action, index) => {
        const newTabProps = action.newTab ? { rel: "noopener noreferrer", target: "_blank" } : {};

        return (
          <Button
            key={`${action.label}-${index}`}
            asChild
            size={ButtonSize.Small}
            variant={action.variant}
          >
            <NextLink href={action.href} {...newTabProps}>
              {action.label}
              {action.variant === ButtonVariant.Accent && <span aria-hidden>&rarr;</span>}
            </NextLink>
          </Button>
        );
      })}
    </>
  );
}
