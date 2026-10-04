import NextLink from "next/link";

import { Button } from "@/components/button";
import { ButtonSize } from "@/components/button/types";
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
            size={ButtonSize.Base}
            variant={action.variant}
          >
            <NextLink href={action.href} {...newTabProps}>
              {action.label}
            </NextLink>
          </Button>
        );
      })}
    </>
  );
}
