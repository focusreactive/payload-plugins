export interface WbBrandWorldItem {
  /** Big faint index numeral, e.g. "01". */
  number: string;
  brand: string;
  description: string;
  /** Soft pills listing what the brand covers. */
  includes: string[];
  /** Headline shown under the "Latest" footer label. */
  latestHighlight: string;
  latestCta: string;
  href?: string;
}

export interface WbBrandWorldsProps {
  eyebrow: string;
  /** First heading line, rendered before the break. */
  title: string;
  /** Optional second heading line, rendered after a <br />. */
  titleSecondLine?: string;
  subtitle: string;
  items: WbBrandWorldItem[];
}
