import { NewsletterSection } from "@/components/newsletter";
import { getTranslations } from "next-intl/server";

import { SectionContainer } from "@/components/shared";

export async function NewsletterBand() {
  const t = await getTranslations("blog.newsletter");

  return (
    <SectionContainer sectionData={{ paddingY: "none", theme: "dark" }}>
      <NewsletterSection
        heading={{ eyebrow: t("eyebrow"), title: t("heading") }}
        inputPlaceholder={t("placeholder")}
        buttonLabel={t("button")}
        disclaimer={t("disclaimer")}
        theme="dark"
      />
    </SectionContainer>
  );
}
