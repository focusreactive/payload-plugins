import React from "react";

import { SiteButton } from "@/components/site/SiteButton";
import { SiteBackground, SiteImage, mediaOf } from "@/components/site/SiteImage";
import { InlineRichText, hasRichText } from "@/components/site/SiteRichText";
import { SiteSlider } from "@/components/site/SiteSlider";
import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";
import type { ResultsSliderBlock } from "@/payload-types";

import type { SiteBlockProps } from "../types";
import { SmallPrint } from "./stickyMediaSmallPrint";

type Result = NonNullable<ResultsSliderBlock["items"]>[number];

interface Labels {
  symptomsLabel: string;
  beforeLabel: string;
  afterLabel: string;
}

function ResultSlide({ result, labels }: { result: Result; labels: Labels }) {
  const rating = Math.round(result.rating ?? 5);
  const symptoms = result.symptoms ?? [];

  return (
    <>
      <div className="text-container">
        {symptoms.length > 0 && (
          <div className="symptoms-container">
            <h4>{labels.symptomsLabel}</h4>
            {symptoms.map((symptom) => (
              <div className="symptom" key={symptom.id}>
                <figure className="circle">
                  <SiteImage alt={stripMarkers(symptom.name)} media={symptom.icon} />
                </figure>
                <h5>{symptom.name}</h5>
              </div>
            ))}
          </div>
        )}
        <div className="details">
          <div className="stars">
            {Array.from({ length: rating }, (_, star) => (
              <span key={star} />
            ))}
          </div>
          {mediaOf(result.sourceLogo) && (
            <figure className="source">
              <SiteImage alt="" height={30} media={result.sourceLogo} width={60} />
            </figure>
          )}
        </div>
        <blockquote>
          <div className="quote">&ldquo;{result.quote}&rdquo;</div>
          <cite>
            <span>{result.author}</span>
            {result.place && <span>{result.place}</span>}
          </cite>
        </blockquote>
      </div>
      <div className="image-container">
        <div className="before">
          <span>{labels.beforeLabel}</span>
          <SiteBackground media={result.before} />
        </div>
        <div className="after">
          <span>{labels.afterLabel}</span>
          <SiteBackground media={result.after} />
        </div>
      </div>
    </>
  );
}

export function ResultsSliderComponent({
  eyebrow,
  heading,
  note,
  button,
  align,
  symptomsLabel,
  beforeLabel,
  afterLabel,
  items,
  locale,
}: SiteBlockProps<ResultsSliderBlock>) {
  const labels: Labels = {
    afterLabel: afterLabel || "After",
    beforeLabel: beforeLabel || "Before",
    symptomsLabel: symptomsLabel || "Symptoms",
  };

  return (
    <section className="results_slider">
      <div className="container">
        <div className="text-container">
          {eyebrow && <h2 className="small">{eyebrow}</h2>}
          {hasRichText(heading) && (
            <h2>
              <InlineRichText data={heading} />
            </h2>
          )}
          {note && (
            <SmallPrint>
              <em>{note}</em>
            </SmallPrint>
          )}
          <SiteButton button={button} locale={locale} />
        </div>
        <div className="slider-container">
          <SiteSlider
            className={align === "center" ? "slides center" : "slides"}
            slidesToShow={{ desktop: 1, medium: 2.1, mobile: 1, small: 2.1 }}
            type="results"
          >
            {(items ?? []).map((result, index) => (
              <ResultSlide key={result.id ?? index} labels={labels} result={result} />
            ))}
          </SiteSlider>
        </div>
        <SiteButton button={button} locale={locale} />
      </div>
    </section>
  );
}
