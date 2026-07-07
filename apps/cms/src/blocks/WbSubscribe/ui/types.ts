export interface WbSubscribePlan {
  /** Stable id used to track which plan card is selected. */
  value: string;
  title: string;
  /** Short tag label shown as a pill, e.g. "Paid" / "Free". */
  tagLabel: string;
  /** Drives the pill colour: red for paid, chip/teal for free. */
  tagTone: "paid" | "free";
  description: string;
  cta: string;
  /** Optional right-aligned note beside the CTA (e.g. "Payment handled externally"). */
  note?: string;
}

export interface WbSubscribeProps {
  eyebrow: string;
  title: string;
  plans: WbSubscribePlan[];
  /** Which plan is selected on first render. Defaults to the first plan. */
  defaultPlanValue?: string;

  detailsLabel?: string;
  emailPlaceholder?: string;
  firstNamePlaceholder?: string;
  lastNamePlaceholder?: string;
  companyPlaceholder?: string;
  regions?: string[];
  defaultRegion?: string;
  agreeLabel?: string;
  submitLabel?: string;
  errorMessage?: string;
  privacyText?: string;
  privacyLinkLabel?: string;
  privacyHref?: string;

  successTitle?: string;
  successBody?: string;
  successCtaLabel?: string;
}
