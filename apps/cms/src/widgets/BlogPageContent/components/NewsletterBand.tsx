import { NewsletterSection } from "@repo/ui";
import { getTranslations } from "next-intl/server";

import { SectionContainer } from "@/core/ui";

export async function NewsletterBand() {
  const t = await getTranslations("blog.newsletter");

  return (
    <SectionContainer sectionData={{ paddingY: "none", theme: "dark" }}>
      <NewsletterSection
        header={{ align: "center", eyebrow: { text: t("badge") }, title: t("heading") }}
        inputPlaceholder={t("placeholder")}
        buttonLabel={t("button")}
        disclaimer={t("disclaimer")}
        theme="dark"
      />
    </SectionContainer>
  );
}
