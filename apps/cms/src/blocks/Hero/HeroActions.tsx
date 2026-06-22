import React from "react";

import { CMSLink } from "@/components/shared";
import type { HeroBlock } from "@/payload-types";

type Action = NonNullable<HeroBlock["actions"]>[number];

export function HeroActions({ actions }: { actions: Action[] }) {
  return (
    <ul className="flex gap-4 flex-wrap">
      {actions.map((action, i) => (
        <li key={i}>
          <CMSLink {...action} />
        </li>
      ))}
    </ul>
  );
}
