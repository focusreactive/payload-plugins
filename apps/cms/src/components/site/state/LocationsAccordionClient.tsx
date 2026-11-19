"use client";

import React, { useState } from "react";

import { ClinicSites } from "./ClinicSites";
import type { ClinicSite } from "./stateData";

export interface LocationGroup {
  /** The original map script's key, also the group's id: the state's letters or the area's name. */
  key: string;
  label: string;
  sites: ClinicSite[];
  allLink: { href?: string; text: string };
}

interface Props {
  groups: LocationGroup[];
  reviewsLabel: string;
  linkText: string;
}

/** The site's `ul.accordion-locations`: one group per state or area, each opened on its own. */
export function LocationsAccordionClient({ groups, reviewsLabel, linkText }: Props) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => new Set());

  const toggle = (key: string) =>
    setOpenKeys((keys) => {
      const next = new Set(keys);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });

  return (
    <ul className="accordion-locations">
      {groups.map((group) => {
        const open = openKeys.has(group.key);

        return (
          <li id={`accordion-${group.key}`} key={group.key}>
            <button
              aria-expanded={open}
              className={open ? "accordion-button open" : "accordion-button"}
              onClick={() => toggle(group.key)}
              type="button"
            >
              <h3>{`${group.label} (${group.sites.length})`}</h3>
            </button>
            <div className="answer">
              <ClinicSites
                allLink={group.allLink}
                linkText={linkText}
                mapKey={group.key}
                reviewsLabel={reviewsLabel}
                sites={group.sites}
                variant="index"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
