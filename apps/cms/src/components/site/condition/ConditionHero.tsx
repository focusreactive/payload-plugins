import React from "react";

import { mediaUrl } from "@/components/site/SiteImage";
import type { Locale } from "@/lib/types";
import type { Condition } from "@/payload-types";
import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";

import { SymptomHeroNav } from "./SymptomHeroNav";
import { SymptomLinks } from "./SymptomLinks";

const MOBILE_BREAKPOINT = "768px";
const CSS_SAFE_URL = /^(?:https?:\/\/|\/)[^\s"'()\\]+$/u;

interface ConditionHeroProps {
  condition: Condition;
  conditions: Condition[];
  locale: Locale;
}

function cssUrl(value: string | undefined): string | null {
  const url = stripMarkers(value);

  return url && CSS_SAFE_URL.test(url) ? url : null;
}

/**
 * The condition page's `#hero`: a heading over a scrolling row of every condition on a wide
 * picture. Like the original script, phones up to 768px wide get the phone picture instead.
 */
export function ConditionHero({ condition, conditions, locale }: ConditionHeroProps) {
  const desktopUrl = cssUrl(mediaUrl(condition.heroImage));
  const mobileUrl = cssUrl(mediaUrl(condition.heroMobileImage));
  const hasHeading = Boolean(condition.navHeading || condition.navHeadingEnd);

  return (
    <section id="hero">
      {mobileUrl && (
        <style href={`condition-hero-${condition.id}-${locale}`} precedence="site-overrides">
          {`@media (max-width:${MOBILE_BREAKPOINT}){#hero>.bg-container{background-image:url("${mobileUrl}")!important}}`}
        </style>
      )}
      <div
        className="bg-container"
        style={desktopUrl ? { backgroundImage: `url("${desktopUrl}")` } : undefined}
      />
      <div className="container">
        {hasHeading && (
          <h2>
            {condition.navHeading}
            {condition.navHeadingEnd && (
              <>
                {" "}
                <span>{condition.navHeadingEnd}</span>
              </>
            )}
          </h2>
        )}
        <SymptomHeroNav>
          <SymptomLinks conditions={conditions} currentId={condition.id} locale={locale} />
        </SymptomHeroNav>
      </div>
    </section>
  );
}
