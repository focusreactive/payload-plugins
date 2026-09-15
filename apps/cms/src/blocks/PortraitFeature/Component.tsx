import React from "react";

import { PortraitFeature } from "./ui";

import { SectionContainer } from "@/components/shared";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { PortraitFeatureBlock } from "@/payload-types";

export const PortraitFeatureBlockComponent: React.FC<PortraitFeatureBlock> = async ({
  personName,
  heading,
  description,
  link,
  portrait,
  section,
  id,
}) => {
  const locale = await resolveLocale();
  const preparedLink = link ? prepareLinkProps(link, locale) : null;
  const uploadedPortrait =
    portrait?.image && typeof portrait.image === "object" ? portrait.image : null;

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <PortraitFeature
        description={description}
        heading={heading}
        linkHref={preparedLink?.href}
        linkLabel={preparedLink?.text}
        linkOpensInNewTab={link?.newTab ?? false}
        personName={personName}
        portraitAlt={uploadedPortrait?.alt ?? ""}
        portraitSrc={uploadedPortrait?.url ?? undefined}
      />
    </SectionContainer>
  );
};
