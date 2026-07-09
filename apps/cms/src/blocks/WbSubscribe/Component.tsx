import React from "react";

import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { WbSubscribeBlock } from "@/payload-types";

import { WbSubscribe } from "./ui";

export async function WbSubscribeBlockComponent(props: WbSubscribeBlock) {
  const {
    eyebrow,
    title,
    plans,
    defaultPlanValue,
    detailsLabel,
    emailPlaceholder,
    firstNamePlaceholder,
    lastNamePlaceholder,
    companyPlaceholder,
    regions,
    defaultRegion,
    agreeLabel,
    submitLabel,
    errorMessage,
    privacyText,
    privacyLink,
    successTitle,
    successBody,
    successCtaLabel,
  } = props;
  const locale = await resolveLocale();

  const privacy = prepareLinkProps(privacyLink, locale);

  return (
    <WbSubscribe
      eyebrow={eyebrow ?? ""}
      title={title ?? ""}
      plans={(plans ?? []).map((plan) => ({
        value: plan.value ?? "",
        title: plan.title ?? "",
        tagLabel: plan.tagLabel ?? "",
        tagTone: plan.tagTone ?? "free",
        description: plan.description ?? "",
        cta: plan.cta ?? "",
        note: plan.note ?? "",
      }))}
      defaultPlanValue={defaultPlanValue ?? undefined}
      detailsLabel={detailsLabel ?? undefined}
      emailPlaceholder={emailPlaceholder ?? undefined}
      firstNamePlaceholder={firstNamePlaceholder ?? undefined}
      lastNamePlaceholder={lastNamePlaceholder ?? undefined}
      companyPlaceholder={companyPlaceholder ?? undefined}
      regions={
        regions && regions.length > 0 ? regions.map((entry) => entry.region ?? "") : undefined
      }
      defaultRegion={defaultRegion ?? undefined}
      agreeLabel={agreeLabel ?? undefined}
      submitLabel={submitLabel ?? undefined}
      errorMessage={errorMessage ?? undefined}
      privacyText={privacyText ?? undefined}
      privacyLinkLabel={privacy.text || undefined}
      privacyHref={privacy.href || "#"}
      successTitle={successTitle ?? undefined}
      successBody={successBody ?? undefined}
      successCtaLabel={successCtaLabel ?? undefined}
    />
  );
}
