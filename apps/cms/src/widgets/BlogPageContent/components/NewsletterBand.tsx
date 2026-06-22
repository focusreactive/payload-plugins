import { NewsletterSection } from "@/components/ui";
import { getTranslations } from "next-intl/server";

import { SectionContainer } from "@/core/ui";
import { prepareSectionHeaderProps } from "@/lib/adapters/prepareSectionHeaderProps";

export async function NewsletterBand() {
  const t = await getTranslations("blog.newsletter");

  return (
    <SectionContainer sectionData={{ paddingY: "none", theme: "dark" }}>
      <NewsletterSection
        header={prepareSectionHeaderProps({ align: "center", eyebrow: t("eyebrow"), heading: t("heading") })}
        inputPlaceholder={t("placeholder")}
        buttonLabel={t("button")}
        disclaimer={t("disclaimer")}
        theme="dark"
      />
    </SectionContainer>
  );
}
