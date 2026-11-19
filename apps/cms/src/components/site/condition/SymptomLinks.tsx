import React from "react";

import { withLocalePrefix } from "@/lib/config/entityRoutes";
import { entityDocPath } from "@/lib/site/links";
import type { Locale } from "@/lib/types";
import type { Condition } from "@/payload-types";
import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";

import { SymptomIcon } from "./SymptomIcon";

interface SymptomLinksProps {
  conditions: Condition[];
  currentId: Condition["id"];
  locale: Locale;
}

/**
 * One `li` per condition, as both condition menus list them: the page's own condition is marked
 * active and links to the page itself, every other one links straight to its content.
 */
export function SymptomLinks({ conditions, currentId, locale }: SymptomLinksProps) {
  return conditions.map((condition) => {
    const path = entityDocPath("conditions", condition);
    const isCurrent = condition.id === currentId;
    const href = path ? `${withLocalePrefix(path, locale)}${isCurrent ? "" : "#main"}` : undefined;

    return (
      <li className={isCurrent ? "active" : undefined} key={condition.id}>
        <a className="circle-images-container" href={href}>
          <SymptomIcon alt={stripMarkers(condition.title) ?? ""} media={condition.icon} />
          <h4>{condition.title}</h4>
        </a>
      </li>
    );
  });
}
