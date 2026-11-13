import React from "react";

import { SiteButton } from "@/components/site/SiteButton";
import { SiteBackground, SiteImage, mediaOf, mediaUrl } from "@/components/site/SiteImage";
import { InlineRichText, SiteRichText, hasRichText } from "@/components/site/SiteRichText";
import { SiteSlider } from "@/components/site/SiteSlider";
import { SiteVideo } from "@/components/site/SiteVideo";
import { findEntities, idOf, orderByIds } from "@/dal/entities";
import { BLOG_CONFIG } from "@/lib/config/blog";
import { withLocalePrefix } from "@/lib/config/entityRoutes";
import { entityDocPath, siteLinkHref, siteLinkTarget } from "@/lib/site/links";
import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";
import type {
  BeforeAfterBlock,
  Clinic,
  ConditionGridBlock,
  Doctor,
  DoctorSliderBlock,
  IconListBlock,
  InsuranceBlock,
  LogoStripBlock,
  MediaTextBlock,
  PostSliderBlock,
  ReviewSliderBlock,
  SiteCtaBlock,
  Testimonial,
  TreatmentCardsBlock,
} from "@/payload-types";

import { backgroundClass } from "./shared";
import type { SiteBlockProps } from "./types";

const classNames = (...names: (string | false | null | undefined)[]): string =>
  names.filter(Boolean).join(" ");

/** The last slide of a slider, which repeats the section's link as a tile. */
function SeeAllLink({
  text,
  button,
  locale,
}: {
  text?: string | null;
  button?: { link?: Parameters<typeof siteLinkHref>[0] } | null;
  locale: string;
}) {
  const href = siteLinkHref(button?.link, locale);

  if (!text || !href) {
    return null;
  }

  return (
    <a href={href} {...siteLinkTarget(button?.link)}>
      {text}
    </a>
  );
}

export function LogoStripComponent({
  eyebrow,
  logos,
  background,
  locale: _locale,
}: SiteBlockProps<LogoStripBlock>) {
  return (
    <section className={classNames("trustlogos center", backgroundClass(background))}>
      <div className="container">
        {eyebrow && <h2 className="small">{eyebrow}</h2>}
        <div className="trustlogos-container">
          {(logos ?? []).map((logo) => (
            <figure className="trustlogo" key={logo.id}>
              <SiteImage media={logo.image} />
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

export function IconListComponent({
  eyebrow,
  heading,
  button,
  items,
  locale,
}: SiteBlockProps<IconListBlock>) {
  return (
    <section className="vertical_icons">
      <div className="container">
        <div className="left">
          {eyebrow && <h2 className="small">{eyebrow}</h2>}
          {hasRichText(heading) && (
            <h3>
              <InlineRichText data={heading} />
            </h3>
          )}
          <SiteButton button={button} className="button border" locale={locale} />
        </div>
        <div className="right">
          <ul className="icons-list">
            {(items ?? []).map((item) => (
              <li key={item.id}>
                <figure className="circle">
                  <SiteImage height={80} media={item.icon} width={80} />
                </figure>
                <div className="text-container">
                  <h4>{item.title}</h4>
                  {item.text && <p>{item.text}</p>}
                </div>
              </li>
            ))}
          </ul>
        </div>
        <SiteButton button={button} className="button border" locale={locale} />
      </div>
    </section>
  );
}

export function MediaTextComponent({
  heading,
  text,
  button,
  side,
  size,
  background,
  image,
  videoUrl,
  locale,
}: SiteBlockProps<MediaTextBlock>) {
  const video = stripMarkers(videoUrl);

  return (
    <section
      className={classNames(
        "media_text",
        side ?? "left",
        size !== "regular" && size,
        backgroundClass(background)
      )}
    >
      <div className="container">
        <div className="text-container">
          {hasRichText(heading) && (
            <h2>
              <InlineRichText data={heading} />
            </h2>
          )}
          <SiteRichText data={text} locale={locale} />
          <SiteButton button={button} locale={locale} />
        </div>
        {video ? (
          <div className="video-container">
            <SiteVideo poster={mediaUrl(image)} src={video} />
          </div>
        ) : (
          <figure className="image-container">
            <SiteImage media={image} />
          </figure>
        )}
        <SiteButton button={button} locale={locale} />
      </div>
    </section>
  );
}

export function InsuranceComponent({
  heading,
  text,
  button,
  logos,
  locale,
}: SiteBlockProps<InsuranceBlock>) {
  return (
    <section className="insurance">
      <div className="container">
        <div className="text-container">
          {hasRichText(heading) && (
            <h2>
              <InlineRichText data={heading} />
            </h2>
          )}
          <SiteRichText data={text} locale={locale} />
          <SiteButton button={button} className="button border" locale={locale} />
        </div>
        <div className="insurance-list">
          {(logos ?? []).map((logo) => (
            <figure className="insurance-logo" key={logo.id}>
              <SiteImage media={logo.image} />
            </figure>
          ))}
        </div>
        <SiteButton button={button} className="button border" locale={locale} />
      </div>
    </section>
  );
}

// The site breaks a badge of several words before its last word.
function splitBadge(label: string): string[] {
  const words = label.trim().split(/\s+/u);

  return words.length > 2 ? [words.slice(0, -1).join(" "), words.at(-1) ?? ""] : [label];
}

export function DoctorCard({ doctor, locale }: { doctor: Doctor; locale: string }) {
  const path = entityDocPath("doctors", doctor);
  const badge = stripMarkers(doctor.featuredLabel);
  const badgeParts = badge ? splitBadge(badge) : [];

  return (
    <a href={path ? withLocalePrefix(path, locale) : undefined}>
      {badgeParts.length > 0 && (
        <div className={classNames("featured-label doctor", badgeParts.length > 1 && "split")}>
          {badgeParts.map((part) => (
            <span key={part}>{part}</span>
          ))}
        </div>
      )}
      <figure className="circle">
        <SiteImage media={doctor.photo} />
      </figure>
      <h4>{doctor.name}</h4>
      {doctor.jobTitle && <p>{doctor.jobTitle}</p>}
    </a>
  );
}

async function resolveDoctors(
  picked: DoctorSliderBlock["doctors"],
  { context, locale }: Pick<SiteBlockProps<DoctorSliderBlock>, "context" | "locale">
): Promise<Doctor[]> {
  if (picked?.length) {
    const ids = picked.map(idOf);
    const docs = await findEntities("doctors", { locale, where: { id: { in: ids } } });

    return orderByIds(docs, ids);
  }

  if (context?.collection === "clinics") {
    return findEntities("doctors", {
      locale,
      sort: "name",
      where: { clinics: { in: [context.doc.id] } },
    });
  }

  if (context?.collection === "states") {
    const clinics = await findEntities("clinics", {
      depth: 0,
      locale,
      where: { state: { equals: context.doc.id } },
    });

    if (clinics.length === 0) {
      return [];
    }

    return findEntities("doctors", {
      locale,
      sort: "name",
      where: { clinics: { in: clinics.map((clinic) => clinic.id) } },
    });
  }

  return findEntities("doctors", { locale, sort: "name" });
}

export async function DoctorSliderComponent({
  heading,
  text,
  button,
  bottomButton,
  seeAllText,
  image,
  doctors,
  locale,
  context,
}: SiteBlockProps<DoctorSliderBlock>) {
  const doctorDocs = await resolveDoctors(doctors, { context, locale });

  return (
    <section className="experts mobile-slider">
      <SiteBackground media={image} />
      <div className="container">
        <div className="text-container">
          {hasRichText(heading) && (
            <h2>
              <InlineRichText data={heading} />
            </h2>
          )}
          <SiteRichText data={text} locale={locale} />
          <SiteButton button={button} className="button border" locale={locale} />
        </div>
        <div className="slider-container">
          <SiteSlider
            seeAll={SeeAllLink({ button, locale, text: seeAllText })}
            slidesToShow={{ desktop: 2, medium: 2.1, mobile: 1.13, small: 2.1 }}
            type="experts"
          >
            {doctorDocs.map((doctor) => (
              <DoctorCard doctor={doctor} key={doctor.id} locale={locale} />
            ))}
          </SiteSlider>
        </div>
        <SiteButton button={bottomButton} locale={locale} />
      </div>
    </section>
  );
}

export function ReviewCard({ review }: { review: Testimonial }) {
  const clinic: Clinic | null = typeof review.clinic === "object" ? (review.clinic ?? null) : null;
  const place = review.place || clinic?.name;
  const rating = Math.round(review.rating ?? 5);

  return (
    <>
      <div className="details">
        <div className="stars">
          {Array.from({ length: rating }, (_, index) => (
            <span key={index} />
          ))}
        </div>
        {mediaOf(review.sourceLogo) && (
          <figure className="source">
            <SiteImage alt="" height={30} media={review.sourceLogo} width={60} />
          </figure>
        )}
      </div>
      <blockquote>
        <div className="quote">&ldquo;{review.content}&rdquo;</div>
        <cite>
          <span>{review.author}</span>
          {place && <span>{place}</span>}
        </cite>
      </blockquote>
    </>
  );
}

async function resolveReviews(
  picked: ReviewSliderBlock["reviews"],
  { context, locale }: Pick<SiteBlockProps<ReviewSliderBlock>, "context" | "locale">
): Promise<Testimonial[]> {
  if (picked?.length) {
    const ids = picked.map(idOf);
    const docs = await findEntities("testimonials", { locale, where: { id: { in: ids } } });

    return orderByIds(docs, ids);
  }

  if (context?.collection === "clinics") {
    return findEntities("testimonials", {
      limit: 12,
      locale,
      sort: "-createdAt",
      where: { clinic: { equals: context.doc.id } },
    });
  }

  return findEntities("testimonials", { limit: 8, locale, sort: "-createdAt" });
}

export async function ReviewSliderComponent({
  eyebrow,
  heading,
  button,
  seeAllText,
  reviews,
  locale,
  context,
}: SiteBlockProps<ReviewSliderBlock>) {
  const reviewDocs = await resolveReviews(reviews, { context, locale });
  const seeAll = SeeAllLink({ button, locale, text: seeAllText });

  return (
    <section className="reviews_slider">
      <div className="container">
        <div className="text-container">
          {eyebrow && <h2 className="small">{eyebrow}</h2>}
          {hasRichText(heading) && (
            <h3>
              <InlineRichText data={heading} />
            </h3>
          )}
          <SiteButton button={button} locale={locale} />
        </div>
        <div className="slider-container">
          <SiteSlider
            seeAll={seeAll}
            slidesToShow={{ desktop: 2.2, medium: 2.1, mobile: 1.1, small: 2.1 }}
            type="reviews"
          >
            {reviewDocs.map((review) => (
              <ReviewCard key={review.id} review={review} />
            ))}
          </SiteSlider>
        </div>
        <SiteButton button={button} locale={locale} />
      </div>
    </section>
  );
}

export async function ConditionGridComponent({
  heading,
  text,
  listHeading,
  conditions,
  linkText,
  button,
  background,
  locale,
}: SiteBlockProps<ConditionGridBlock>) {
  const ids = (conditions ?? []).map(idOf);
  const docs = await findEntities("conditions", {
    locale,
    sort: "listOrder",
    where: ids.length > 0 ? { id: { in: ids } } : undefined,
  });
  const conditionDocs = ids.length > 0 ? orderByIds(docs, ids) : docs;

  return (
    <section className={classNames("center_text", backgroundClass(background))}>
      <div className="container">
        {hasRichText(heading) && (
          <h2>
            <InlineRichText data={heading} />
          </h2>
        )}
        <SiteRichText data={text} locale={locale} />
        {listHeading && <h3 className="small small-mobile">{listHeading}</h3>}
        <ul className="circle-images-container symptoms">
          {conditionDocs.map((condition) => {
            const path = entityDocPath("conditions", condition);

            return (
              <li data-link-text={stripMarkers(linkText) ?? undefined} key={condition.id}>
                <a href={path ? withLocalePrefix(path, locale) : undefined}>
                  <figure className="circle">
                    <SiteImage
                      alt={stripMarkers(condition.title)}
                      height={100}
                      media={condition.icon}
                      width={100}
                    />
                  </figure>
                  <h5>{condition.title}</h5>
                  <span className="icon-svg-content" />
                </a>
              </li>
            );
          })}
        </ul>
        <div className="symptoms-button">
          <SiteButton button={button} locale={locale} />
        </div>
      </div>
    </section>
  );
}

export function BeforeAfterComponent({
  heading,
  text,
  button,
  seeAllText,
  beforeLabel,
  afterLabel,
  pairs,
  locale,
}: SiteBlockProps<BeforeAfterBlock>) {
  const seeAll = SeeAllLink({ button, locale, text: seeAllText });

  return (
    <section className="before_after_slider">
      <div className="container">
        <div className="text-container">
          {hasRichText(heading) && (
            <h2>
              <InlineRichText data={heading} />
            </h2>
          )}
          <SiteRichText data={text} locale={locale} />
          <SiteButton button={button} locale={locale} />
        </div>
        <div className="slider-container">
          <SiteSlider
            seeAll={seeAll}
            slidesToShow={{ desktop: 2.2, medium: 2.1, mobile: 1.01, small: 2.1 }}
            type="before_after_images"
          >
            {(pairs ?? []).map((pair) => (
              <div className="image-container" key={pair.id}>
                <div className="before">
                  <span>{beforeLabel || "Before"}</span>
                  <SiteBackground media={pair.before} />
                </div>
                <div className="after">
                  <span>{afterLabel || "After"}</span>
                  <SiteBackground media={pair.after} />
                </div>
              </div>
            ))}
          </SiteSlider>
        </div>
        <SiteButton button={button} locale={locale} />
      </div>
    </section>
  );
}

export async function TreatmentCardsComponent({
  heading,
  checklist,
  treatments,
  linkText,
  button,
  locale,
}: SiteBlockProps<TreatmentCardsBlock>) {
  const ids = (treatments ?? []).map(idOf);
  const docs = await findEntities("treatments", {
    locale,
    sort: "listOrder",
    where: ids.length > 0 ? { id: { in: ids } } : undefined,
  });
  const treatmentDocs = ids.length > 0 ? orderByIds(docs, ids) : docs;

  return (
    <section className="treatment_cards">
      <div className="container">
        {hasRichText(heading) && (
          <h2 className="left">
            <InlineRichText data={heading} />
          </h2>
        )}
        {(checklist?.length ?? 0) > 0 && (
          <ul className="checklist">
            {checklist?.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        <div className="slider-container">
          <SiteSlider
            slidesToScroll={3}
            slidesToShow={{ desktop: 2.9, medium: 2, mobile: 1.1, small: 2.1 }}
            type="treatments"
          >
            {treatmentDocs.map((treatment) => {
              const path = entityDocPath("treatments", treatment);
              const href = path ? withLocalePrefix(path, locale) : undefined;

              return (
                <div className="link" key={treatment.id}>
                  <a href={href}>
                    <div className="bg-wrapper">
                      <SiteBackground media={treatment.cardImage} />
                    </div>
                  </a>
                  <a className="treatment-card-text" href={href}>
                    <div className="text-wrapper">
                      <h4>{treatment.title}</h4>
                      {treatment.summary && <p>{treatment.summary}</p>}
                      {linkText && <span className="button border">{linkText}</span>}
                    </div>
                  </a>
                </div>
              );
            })}
          </SiteSlider>
        </div>
        <div className="treatment-button">
          <SiteButton button={button} locale={locale} />
        </div>
      </div>
    </section>
  );
}

export async function PostSliderComponent({
  logo,
  heading,
  button,
  posts,
  limit,
  locale,
}: SiteBlockProps<PostSliderBlock>) {
  const ids = (posts ?? []).map(idOf);
  const docs = await findEntities("posts", {
    depth: 2,
    limit: ids.length > 0 ? 0 : (limit ?? 6),
    locale,
    sort: "-publishedAt",
    where: ids.length > 0 ? { id: { in: ids } } : undefined,
  });
  const postDocs = ids.length > 0 ? orderByIds(docs, ids) : docs;
  const blogHref = siteLinkHref(button?.link, locale);

  const cards = postDocs.map((post) => {
    const reviewer = typeof post.reviewedBy === "object" ? post.reviewedBy : null;

    return (
      <a
        className="snippet-link"
        href={withLocalePrefix(`${BLOG_CONFIG.basePath}/${stripMarkers(post.slug)}`, locale)}
        key={post.id}
      >
        <div className="bg-wrapper">
          <SiteImage className="bg-container" height={440} media={post.heroImage} width={440} />
        </div>
        <div className="content-wrapper">
          <div className="tag-and-time-wrapper">
            {post.readingTime ? <div className="read-time">{post.readingTime} Min Read</div> : null}
          </div>
          <h4>{post.title}</h4>
          {reviewer && (
            <div className="reviewer">
              <figure className="circle">
                <SiteImage media={reviewer.photo} />
              </figure>
              <p>
                <span className="snippet-author">Medically reviewed by </span>
                {reviewer.name}
              </p>
            </div>
          )}
        </div>
      </a>
    );
  });

  return (
    <section className="blog_slider">
      <div className="container">
        <div className="text-container">
          {mediaOf(logo) && (
            <figure className="blog-logo">
              <a href={blogHref}>
                <SiteImage height={24} media={logo} width={186} />
              </a>
            </figure>
          )}
          {hasRichText(heading) && (
            <h2>
              <InlineRichText data={heading} />
            </h2>
          )}
          <SiteButton button={button} locale={locale} />
        </div>
        <div className="slider-container">
          <SiteSlider
            className="slides hide-mobile"
            slidesToShow={{ desktop: 2.2, medium: 2.1, mobile: 1.1, small: 2.1 }}
            type="blog-post-card"
          >
            {cards}
          </SiteSlider>
          <ul className="no-slider-mobile">
            {cards.map((card) => (
              <li className="blog-post-card" key={card.key}>
                {card}
              </li>
            ))}
          </ul>
        </div>
        <SiteButton button={button} locale={locale} />
      </div>
    </section>
  );
}

export function SiteCtaComponent({ title, text, button, locale }: SiteBlockProps<SiteCtaBlock>) {
  return (
    <section className="cta gradient">
      <div className="container">
        <div className="title">{title}</div>
        {text && <p>{text}</p>}
        <p>
          <SiteButton button={button} className="button border" locale={locale} />
        </p>
      </div>
    </section>
  );
}
