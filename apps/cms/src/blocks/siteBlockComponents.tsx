import React from "react";

import type { Locale } from "@/lib/types";

import {
  BeforeAfterComponent,
  ConditionGridComponent,
  DoctorSliderComponent,
  IconListComponent,
  InsuranceComponent,
  LogoStripComponent,
  MediaTextComponent,
  PostSliderComponent,
  ReviewSliderComponent,
  SiteCtaComponent,
  TreatmentCardsComponent,
} from "./site/components";
import { HeroBannerComponent, HeroVideoComponent } from "./site/HeroVideo";
import { blogBlockComponents } from "./site/templates/blog";
import { clinicBlockComponents } from "./site/templates/clinic";
import { conditionBlockComponents } from "./site/templates/condition";
import { doctorBlockComponents } from "./site/templates/doctor";
import { stateBlockComponents } from "./site/templates/state";
import { treatmentBlockComponents } from "./site/templates/treatment";
import type { SiteBlockComponents, SiteBlockContext } from "./site/types";

/** Block slug to the component that renders it with the site's own markup. */
export const siteBlockComponents: SiteBlockComponents = {
  beforeAfter: BeforeAfterComponent,
  condGrid: ConditionGridComponent,
  docSlider: DoctorSliderComponent,
  heroBanner: HeroBannerComponent,
  heroVideo: HeroVideoComponent,
  iconList: IconListComponent,
  insurance: InsuranceComponent,
  logoStrip: LogoStripComponent,
  mediaText: MediaTextComponent,
  postSlider: PostSliderComponent,
  revSlider: ReviewSliderComponent,
  siteCta: SiteCtaComponent,
  treatCards: TreatmentCardsComponent,
  ...stateBlockComponents,
  ...clinicBlockComponents,
  ...treatmentBlockComponents,
  ...conditionBlockComponents,
  ...doctorBlockComponents,
  ...blogBlockComponents,
};

export const isSiteBlock = (blockType: string | null | undefined): boolean =>
  Boolean(blockType && blockType in siteBlockComponents);

interface RenderProps {
  block: { blockType?: string | null; id?: string | null };
  locale: Locale;
  context?: SiteBlockContext;
}

/** One site section, rendered bare: the site's CSS expects `section` directly under `main`. */
export function RenderSiteBlock({ block, locale, context }: RenderProps): React.ReactNode {
  const Component = block.blockType ? siteBlockComponents[block.blockType] : undefined;

  if (!Component) {
    return null;
  }

  return <Component {...block} context={context} locale={locale} />;
}

interface RenderListProps {
  blocks: RenderProps["block"][] | null | undefined;
  locale: Locale;
  context?: SiteBlockContext;
}

/** The sections of a record-driven page. Hidden sections are skipped. */
export function RenderSiteBlocks({ blocks, locale, context }: RenderListProps): React.ReactNode {
  return (blocks ?? [])
    .filter((block) => !(block as { _hidden?: boolean | null })._hidden)
    .map((block, index) => (
      <RenderSiteBlock block={block} context={context} key={block.id ?? index} locale={locale} />
    ));
}
