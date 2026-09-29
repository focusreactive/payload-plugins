import type { MembershipTiersBlock } from "@/payload-types";
import { joinText } from "@/lib/utils/text";

function extractLinkLabel(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "";
  }
  const { label } = value as { label?: string | null };
  return typeof label === "string" ? label : "";
}

export function extractMembershipTiersText(block: MembershipTiersBlock): string {
  return joinText([
    block.eyebrow,
    block.heading,
    block.billing?.monthlyLabel,
    block.billing?.annualLabel,
    block.billing?.savingsBadge,
    block.billing?.monthlyPeriodSuffix,
    block.billing?.annualPeriodSuffix,
    ...(block.tiers ?? []).flatMap((tier) => [
      tier.name,
      tier.tagline,
      tier.badge,
      tier.priceMonthly,
      tier.priceAnnual,
      extractLinkLabel(tier.link),
      tier.featuresHeading,
      ...(tier.features ?? []).map((feature) => feature.label),
    ]),
  ]);
}
