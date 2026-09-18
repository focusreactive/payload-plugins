import type { Block } from "payload";

import { getBlockPreviewImage } from "@/lib/utils/blockPreviewImage";
import { injectSection } from "@/lib/fields/section/injectSection";

import { membershipTiersFields } from "./fields";

export const MembershipTiersBlock: Block = injectSection({
  slug: "membershipTiers",
  interfaceName: "MembershipTiersBlock",
  ...getBlockPreviewImage("Membership Tiers"),
  labels: {
    plural: { en: "Membership Tiers", es: "Niveles de membresía" },
    singular: { en: "Membership Tiers", es: "Niveles de membresía" },
  },
  fields: membershipTiersFields,
});
