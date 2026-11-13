import type { Block } from "payload";

import {
  BeforeAfterBlock,
  ConditionGridBlock,
  DoctorSliderBlock,
  IconListBlock,
  InsuranceBlock,
  LogoStripBlock,
  MediaTextBlock,
  PostSliderBlock,
  ReviewSliderBlock,
  SiteCtaBlock,
  TreatmentCardsBlock,
} from "./site/configs";
import { blogBlocks } from "./site/templates/blog";
import { clinicBlocks } from "./site/templates/clinic";
import { conditionBlocks } from "./site/templates/condition";
import { doctorBlocks } from "./site/templates/doctor";
import { stateBlocks } from "./site/templates/state";
import { treatmentBlocks } from "./site/templates/treatment";

/**
 * Every section of the site's own design. One list serves pages and every record collection, so a
 * section built for one page type can be placed on any other.
 */
export const siteBlocks: Block[] = [
  LogoStripBlock,
  IconListBlock,
  MediaTextBlock,
  InsuranceBlock,
  DoctorSliderBlock,
  ReviewSliderBlock,
  ConditionGridBlock,
  BeforeAfterBlock,
  TreatmentCardsBlock,
  PostSliderBlock,
  SiteCtaBlock,
  ...stateBlocks,
  ...clinicBlocks,
  ...treatmentBlocks,
  ...conditionBlocks,
  ...doctorBlocks,
  ...blogBlocks,
];

export const siteBlockSlugs: string[] = siteBlocks.map((block) => block.slug);
