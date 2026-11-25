import { ChevronRight } from "lucide-react";
import NextLink from "next/link";

import { Button } from "@/components/button";
import { ButtonSize, ButtonVariant } from "@/components/button/types";
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
            className="pr-5"
          >
            <NextLink href={action.href} {...newTabProps}>
              {action.label}
              {action.variant !== ButtonVariant.Default && (
                <ChevronRight aria-hidden size={16} strokeWidth={1.5} className="mt-0.5" />
              )}
            </NextLink>
          </Button>
        );
      })}
    </>
  );
}
