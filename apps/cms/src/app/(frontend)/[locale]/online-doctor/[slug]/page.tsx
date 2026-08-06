import { Check } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import React from "react";

import { RenderBlocks } from "@/blocks/RenderBlocks";
import { I18N_CONFIG } from "@/lib/config/i18n";
import { Accordion } from "@/components/Accordion";
import { CtaBandSection } from "@/components/CtaBandSection";
import { DisplayHeading } from "@/components/DisplayHeading";
import { Eyebrow } from "@/components/Eyebrow";
import { SectionHeader } from "@/components/SectionHeader";
import { SectionContainer } from "@/components/shared";
import type { Locale } from "@/lib/types";
import { getGeneratedPageBySlug } from "@/dal/getGeneratedPageBySlug";
import { getGeneratedPageLocaleSlugs } from "@/dal/getGeneratedPageLocaleSlugs";
import type {
  City,
  Condition,
  Footer as FooterType,
  Header as HeaderType,
  Page,
} from "@/payload-types";
import { Footer } from "@/collections/Footer/Component";
import { Header } from "@/collections/Header/Component";

interface Args {
  params: Promise<{
    slug?: string;
    locale: Locale;
  }>;
}

function paragraphs(text: string | null | undefined): string[] {
  return (text ?? "")
    .split(/\n{2,}|\r\n{2,}/u)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export default async function GeneratedPageRoute({ params }: Args) {
  const { slug = "", locale } = await params;
  const t = await getTranslations({ locale, namespace: "onlineDoctor" });
  const page = await getGeneratedPageBySlug(decodeURIComponent(slug), locale);

  if (!page) {
    return notFound();
  }

  const condition = typeof page.condition === "object" ? (page.condition as Condition) : null;
  const city = typeof page.city === "object" ? (page.city as City) : null;

  if (!condition || !city) {
    return notFound();
  }

  const introParagraphs = paragraphs(condition.intro);
  const narrativeParagraphs = paragraphs(page.narrative);
  const symptoms = (condition.symptoms ?? []).map((row) => row.symptom).filter(Boolean);
  const faqItems = (condition.faq ?? []).map((item, index) => ({
    content: <p className="text-body">{item.answer}</p>,
    id: item.id ?? String(index),
    trigger: item.question,
  }));
  const provenance = page.provenance;
  const otherLanguages = (page.id ? await getGeneratedPageLocaleSlugs(page.id) : []).filter(
    (entry) => entry.locale !== locale
  );
  // The repo is public: the platform's real URL stays out of code, same as
  // GENERATE_PLATFORM_NAME in the generation endpoint.
  const consultationUrl = process.env.PLATFORM_CTA_URL || "#";

  return (
    <>
      <Header data={page.header as HeaderType} />
      <main>
        <SectionContainer sectionData={{ paddingY: "large" }}>
          {/* SectionHeader hardcodes h2; the page title must be the h1. */}
          <div className="flex max-w-[720px] flex-col gap-5">
            <Eyebrow prefix="dot" tone="accent">
              {`${city.title}, ${city.country}`}
            </Eyebrow>
            <DisplayHeading as="h1" size="display-2" text={page.title} />
            {otherLanguages.length > 0 && (
              <p className="text-muted-foreground text-sm">
                {t("alsoAvailableIn")}{" "}
                {otherLanguages.map((entry, index) => (
                  <React.Fragment key={entry.locale}>
                    {index > 0 && ", "}
                    <Link className="underline underline-offset-4" href={entry.href}>
                      {I18N_CONFIG.locales.find(({ code }) => code === entry.locale)?.endonym ??
                        entry.locale}
                    </Link>
                  </React.Fragment>
                ))}
              </p>
            )}
          </div>
          <div className="mt-10 grid grid-cols-1 gap-[clamp(32px,6vw,80px)] min-[861px]:grid-cols-[1.2fr_0.8fr]">
            <div className="flex flex-col gap-4">
              {introParagraphs.map((paragraph, index) => (
                <p className="text-body-lg" key={index}>
                  {paragraph}
                </p>
              ))}
            </div>
            {symptoms.length > 0 && (
              <div className="h-fit rounded-md border border-border bg-surface p-[26px]">
                <h2 className="mb-5 font-medium text-h5">{t("commonSymptoms")}</h2>
                <ul className="flex flex-col gap-3">
                  {symptoms.map((symptom, index) => (
                    <li className="flex items-start gap-3 text-body" key={index}>
                      <Check aria-hidden className="mt-[5px] size-[18px] shrink-0 text-primary" />
                      {symptom}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </SectionContainer>

        {narrativeParagraphs.length > 0 && (
          <SectionContainer sectionData={{ theme: "light-gray" }}>
            <SectionHeader
              eyebrow={{ text: t("storyEyebrow") }}
              title={t("storyHeading", { city: city.title })}
              subtitle={t("storyDisclaimer")}
              size="h-section"
            />
            <div className="mt-8 flex max-w-[720px] flex-col gap-4">
              {narrativeParagraphs.map((paragraph, index) => (
                <p className="text-body" key={index}>
                  {paragraph}
                </p>
              ))}
            </div>
          </SectionContainer>
        )}

        {(page.extraSections?.length ?? 0) > 0 && (
          <RenderBlocks blocks={page.extraSections as Page["blocks"][0][]} />
        )}

        {faqItems.length > 0 && (
          <SectionContainer sectionData={{}}>
            <div className="grid grid-cols-1 items-start gap-[clamp(32px,6vw,80px)] min-[861px]:grid-cols-[0.8fr_1.2fr]">
              <SectionHeader title={t("faqHeading")} size="h-section" />
              <Accordion items={faqItems} defaultOpenId={faqItems[0]?.id ?? null} />
            </div>
          </SectionContainer>
        )}

        <SectionContainer sectionData={{ theme: "dark" }}>
          <CtaBandSection
            eyebrow={t("ctaEyebrow")}
            heading={t("ctaHeading")}
            description={t("ctaDescription")}
            theme="dark"
            actions={[
              {
                appearance: "accent",
                id: "find-a-doctor",
                label: t("ctaButton"),
                newTab: true,
                type: "custom",
                url: consultationUrl,
              },
            ]}
          />
        </SectionContainer>

        {provenance?.generatedAt && (
          <SectionContainer sectionData={{ paddingY: "base" }}>
            <p className="border-border border-t pt-4 font-mono text-muted-foreground text-xs">
              {provenance.generationModel && provenance.generationInputs
                ? t("provenanceWithModel", {
                    date: new Date(provenance.generatedAt).toLocaleDateString("en-GB"),
                    model: provenance.generationModel,
                    inputs: provenance.generationInputs,
                  })
                : t("provenancePlain", {
                    date: new Date(provenance.generatedAt).toLocaleDateString("en-GB"),
                  })}
            </p>
          </SectionContainer>
        )}
      </main>
      <Footer data={page.footer as FooterType} />
    </>
  );
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug = "", locale } = await params;
  const page = await getGeneratedPageBySlug(decodeURIComponent(slug), locale);

  if (!page) {
    return { title: "Not found" };
  }

  const localeSlugs = page.id ? await getGeneratedPageLocaleSlugs(page.id) : [];

  return {
    alternates: {
      languages: Object.fromEntries(localeSlugs.map((entry) => [entry.locale, entry.href])),
    },
    title: page.title,
    robots: { follow: false, index: false },
  };
}
