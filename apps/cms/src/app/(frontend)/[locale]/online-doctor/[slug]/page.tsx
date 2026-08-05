import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import React from "react";

import { RenderBlocks } from "@/blocks/RenderBlocks";
import { Accordion } from "@/components/Accordion";
import { SectionHeader } from "@/components/SectionHeader";
import { SectionContainer } from "@/components/shared";
import type { Locale } from "@/lib/types";
import { getGeneratedPageBySlug } from "@/dal/getGeneratedPageBySlug";
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

  return (
    <>
      <Header data={page.header as HeaderType} />
      <main>
        <SectionContainer sectionData={{ paddingY: "large" }}>
          <SectionHeader
            eyebrow={{ text: `${city.title}, ${city.country}` }}
            title={page.title}
            size="display-2"
          />
          <div className="mt-10 grid grid-cols-1 gap-[clamp(32px,6vw,80px)] min-[861px]:grid-cols-[1.2fr_0.8fr]">
            <div className="flex flex-col gap-4">
              {introParagraphs.map((paragraph, index) => (
                <p className="text-body" key={index}>
                  {paragraph}
                </p>
              ))}
            </div>
            {symptoms.length > 0 && (
              <div>
                <h2 className="mb-4 font-medium text-h5">{t("commonSymptoms")}</h2>
                <ul className="flex list-disc flex-col gap-2 pl-5">
                  {symptoms.map((symptom, index) => (
                    <li className="text-body" key={index}>
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

        {provenance?.generatedAt && (
          <SectionContainer sectionData={{ paddingY: "base" }}>
            <p className="text-muted-foreground text-sm">
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

  return {
    title: page.title,
    robots: { follow: false, index: false },
  };
}
