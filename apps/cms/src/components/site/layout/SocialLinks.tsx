import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";
import React from "react";

import type { Footer } from "@/payload-types";

export function SocialLinks({ profiles }: { profiles: Footer["social"] }) {
  if (!profiles?.length) {
    return null;
  }

  return (
    <ul className="social-media">
      {profiles.map((profile) => (
        <li key={profile.id}>
          <a
            aria-label={profile.network}
            className={profile.network}
            href={stripMarkers(profile.url)}
            rel="noreferrer"
            target="_blank"
          />
        </li>
      ))}
    </ul>
  );
}
