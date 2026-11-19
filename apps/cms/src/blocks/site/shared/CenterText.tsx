import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";
import React from "react";

import { SiteButton } from "@/components/site/SiteButton";
import { SiteImage, mediaOf } from "@/components/site/SiteImage";
import { findEntities, idOf, orderByIds } from "@/dal/entities";
import { BLOG_CONFIG } from "@/lib/config/blog";
import { withLocalePrefix } from "@/lib/config/entityRoutes";
import { clinicPath, entityDocPath, siteLinkHref } from "@/lib/site/links";
import type { Clinic, Doctor, Post, State } from "@/payload-types";
import type { Locale } from "@/lib/types";

import type { SiteBlockContext } from "../types";
import type { CenterTextKind } from "./centerTextConfig";
import { FaqAccordion, LinkCard } from "./CenterTextClient";
import { BodyText, HeadingText, hasText } from "./content";
import type { RichTextData, SiteButtonValue, TextOrRichText } from "./content";
import { richTextTarget } from "@/components/site/SiteRichText";

type RelationValue<TDoc> = number | TDoc;

export interface CenterTextFaq {
  id?: string | null;
  question?: string | null;
  answer?: RichTextData;
  posts?: RelationValue<Post>[] | null;
}

/**
 * The `center_text` section. A Page or record renders it from its block; a record template can
 * render it directly, for example with a doctor's biography as the text.
 */
export interface CenterTextProps {
  locale: Locale;
  context?: SiteBlockContext;
  background?: "bg" | "white" | "light-blue" | "yellow" | null;
  anchor?: string | null;
  eyebrow?: string | null;
  heading?: TextOrRichText;
  headingLevel?: "h2" | "h3" | null;
  text?: TextOrRichText;
  kind?: CenterTextKind | null;
  faqs?: CenterTextFaq[] | null;
  firstOpen?: boolean | null;
  faqSchema?: boolean | null;
  quote?: string | null;
  quoteBy?: RelationValue<Doctor> | null;
  doctors?: RelationValue<Doctor>[] | null;
  closingText?: TextOrRichText;
  button?: SiteButtonValue;
  buttonStyle?: "filled" | "outline" | null;
}

const SNIPPET_TEXT = {
  en: {
    readTime: (minutes: number) => `${minutes} Min Read`,
    reviewedBy: "Medically reviewed by ",
    writtenBy: "Written by ",
  },
  es: {
    readTime: (minutes: number) => `Lectura de ${minutes} minutos`,
    reviewedBy: "Revisado médicamente por ",
    writtenBy: "Escrito por ",
  },
} as const;

const snippetText = (locale: string) => (locale === "es" ? SNIPPET_TEXT.es : SNIPPET_TEXT.en);

const objectsOf = <TDoc,>(values: RelationValue<TDoc>[] | null | undefined): TDoc[] =>
  (values ?? []).filter((value): value is TDoc => typeof value === "object" && value !== null);

function PostSnippet({ post, locale }: { post: Post; locale: string }) {
  const text = snippetText(locale);
  const reviewer = typeof post.reviewedBy === "object" ? post.reviewedBy : null;
  const [author] = objectsOf(post.authors);
  const byline = reviewer
    ? { className: "reviewer", label: text.reviewedBy, name: reviewer.name, photo: reviewer.photo }
    : author
      ? { className: "author", label: text.writtenBy, name: author.name, photo: author.avatar }
      : null;

  return (
    <li className="post-snippet">
      <a
        className="snippet-link"
        href={withLocalePrefix(`${BLOG_CONFIG.basePath}/${stripMarkers(post.slug)}`, locale)}
      >
        <div className="bg-wrapper">
          <SiteImage
            alt=""
            className="bg-container"
            height={440}
            media={post.heroImage}
            width={440}
          />
        </div>
        <div className="content-wrapper">
          <div className="tag-and-time-wrapper">
            {post.readingTime ? (
              <div className="read-time">{text.readTime(post.readingTime)}</div>
            ) : null}
          </div>
          <h4>{post.title}</h4>
          {byline && (
            <div className={byline.className}>
              <figure className="circle">
                <SiteImage media={byline.photo} />
              </figure>
              <p>
                <span className="snippet-author">{byline.label}</span>
                {byline.name}
              </p>
            </div>
          )}
        </div>
      </a>
    </li>
  );
}

async function FaqList({
  faqs,
  firstOpen,
  faqSchema,
  locale,
}: Pick<CenterTextProps, "faqs" | "firstOpen" | "faqSchema" | "locale">) {
  const items = (faqs ?? []).filter((item) => item.question);
  const postIds = [...new Set(items.flatMap((item) => (item.posts ?? []).map(idOf)))];
  const posts =
    postIds.length > 0
      ? await findEntities("posts", { depth: 2, locale, where: { id: { in: postIds } } })
      : [];

  const entries = items.map((item, index) => {
    const itemPosts = orderByIds(posts, (item.posts ?? []).map(idOf));

    return {
      answer: (
        <>
          <BodyText locale={locale} value={item.answer} />
          {itemPosts.length > 0 && (
            <ul className="blog-snippets-container">
              {itemPosts.map((post) => (
                <PostSnippet key={post.id} locale={locale} post={post} />
              ))}
            </ul>
          )}
        </>
      ),
      key: item.id ?? String(index),
      question: item.question,
    };
  });

  return (
    <FaqAccordion entries={entries} firstOpen={Boolean(firstOpen)} schema={faqSchema !== false} />
  );
}

async function resolveQuoteDoctor(
  quoteBy: CenterTextProps["quoteBy"],
  { context, locale }: Pick<CenterTextProps, "context" | "locale">
): Promise<Doctor | null> {
  if (quoteBy) {
    const [doctor] = await findEntities("doctors", {
      limit: 1,
      locale,
      where: { id: { equals: idOf(quoteBy) } },
    });

    return doctor ?? null;
  }

  return context?.collection === "doctors" ? context.doc : null;
}

async function DoctorQuote({
  quote,
  quoteBy,
  context,
  locale,
}: Pick<CenterTextProps, "quote" | "quoteBy" | "context" | "locale">) {
  if (!quote) {
    return null;
  }

  const doctor = await resolveQuoteDoctor(quoteBy, { context, locale });

  return (
    <blockquote className="doctor-quote">
      <div className="quote">{quote}</div>
      {doctor && (
        <cite>
          {mediaOf(doctor.photo) && (
            <figure className="circle">
              <SiteImage media={doctor.photo} />
            </figure>
          )}
          <div>
            <span>{doctor.name}</span>
            {(doctor.featuredLabel || doctor.jobTitle) && (
              <span>{doctor.featuredLabel || doctor.jobTitle}</span>
            )}
          </div>
        </cite>
      )}
    </blockquote>
  );
}

// The site breaks a badge of several words before its last word.
function splitBadge(label: string): string[] {
  const words = label.trim().split(/\s+/u);

  return words.length > 2 ? [words.slice(0, -1).join(" "), words.at(-1) ?? ""] : [label];
}

function ClinicLinks({ clinics, locale }: { clinics: Clinic[]; locale: string }) {
  return (
    <>
      {clinics.map((clinic, index) => {
        const path = clinicPath(clinic);
        const separator = index === 0 ? null : index === clinics.length - 1 ? " & " : ", ";

        return (
          <React.Fragment key={clinic.id}>
            {separator && <span className="locations-separator">{separator}</span>}
            <a href={path ? withLocalePrefix(path, locale) : undefined}>{clinic.name}</a>
          </React.Fragment>
        );
      })}
    </>
  );
}

function DirectoryCard({ doctor, locale }: { doctor: Doctor; locale: string }) {
  const path = entityDocPath("doctors", doctor);
  const badge = stripMarkers(doctor.featuredLabel)?.trim();
  const badgeParts = badge ? splitBadge(badge) : [];
  const clinics = objectsOf(doctor.clinics);

  return (
    <LinkCard href={path ? withLocalePrefix(path, locale) : undefined}>
      {badgeParts.length > 0 && (
        <div
          className={
            badgeParts.length > 1 ? "featured-label doctor split" : "featured-label doctor"
          }
        >
          {badgeParts.map((part) => (
            <span key={part}>{part}</span>
          ))}
        </div>
      )}
      <figure className="circle">
        <SiteImage media={doctor.photo} />
      </figure>
      <div className="text-container">
        <div className="featured-label-mobile">
          {badge && (
            <div className="featured-label doctor">
              <span>{badge}</span>
            </div>
          )}
        </div>
        <h4 className="title">{doctor.name}</h4>
        {doctor.jobTitle && <p>{doctor.jobTitle}</p>}
      </div>
      {clinics.length > 0 && (
        <div className="location-snippet">
          <div>
            <ClinicLinks clinics={clinics} locale={locale} />
          </div>
        </div>
      )}
    </LinkCard>
  );
}

interface StateGroup {
  state: State;
  doctors: Doctor[];
}

function groupByState(doctors: Doctor[]): StateGroup[] {
  const groups = new Map<number, StateGroup>();

  for (const doctor of doctors) {
    for (const clinic of objectsOf(doctor.clinics)) {
      const state = typeof clinic.state === "object" ? clinic.state : null;

      if (!state) {
        continue;
      }

      const group = groups.get(state.id) ?? { doctors: [], state };

      if (!group.doctors.includes(doctor)) {
        group.doctors.push(doctor);
      }
      groups.set(state.id, group);
    }
  }

  return [...groups.values()].sort((first, second) =>
    stripMarkers(first.state.name).localeCompare(stripMarkers(second.state.name))
  );
}

async function DoctorDirectory({ doctors, locale }: Pick<CenterTextProps, "doctors" | "locale">) {
  const ids = (doctors ?? []).map(idOf);
  const docs = await findEntities("doctors", {
    depth: 2,
    locale,
    sort: "name",
    where: ids.length > 0 ? { id: { in: ids } } : undefined,
  });
  const ordered = ids.length > 0 ? orderByIds(docs, ids) : docs;

  return (
    <>
      {groupByState(ordered).map(({ state, doctors: stateDoctors }) => (
        <React.Fragment key={state.id}>
          <h3>{state.name}</h3>
          <div className="cards-container cards">
            <div>
              {stateDoctors.map((doctor) => (
                <DirectoryCard doctor={doctor} key={doctor.id} locale={locale} />
              ))}
            </div>
          </div>
        </React.Fragment>
      ))}
    </>
  );
}

export function CenterText({
  locale,
  context,
  background,
  anchor,
  eyebrow,
  heading,
  headingLevel,
  text,
  kind,
  faqs,
  firstOpen,
  faqSchema,
  quote,
  quoteBy,
  doctors,
  closingText,
  button,
  buttonStyle,
}: CenterTextProps) {
  const HeadingTag = headingLevel === "h3" ? "h3" : "h2";
  const hasButton = Boolean(button?.text && siteLinkHref(button.link, locale));

  return (
    <section
      className={`center_text ${background ?? "bg"}`}
      id={stripMarkers(anchor)?.trim() || undefined}
    >
      <div className="container">
        {eyebrow && <h2 className="small">{eyebrow}</h2>}
        {hasText(heading) && (
          <HeadingTag {...richTextTarget(heading)}>
            <HeadingText value={heading} />
          </HeadingTag>
        )}
        <BodyText locale={locale} value={text} />
        {kind === "faq" && (
          <FaqList faqSchema={faqSchema} faqs={faqs} firstOpen={firstOpen} locale={locale} />
        )}
        {kind === "quote" && (
          <DoctorQuote context={context} locale={locale} quote={quote} quoteBy={quoteBy} />
        )}
        {kind === "doctors" && <DoctorDirectory doctors={doctors} locale={locale} />}
        <BodyText locale={locale} value={closingText} />
        {hasButton && (
          <p>
            <SiteButton
              button={button}
              className={buttonStyle === "outline" ? "button border" : "button"}
              locale={locale}
            />
          </p>
        )}
      </div>
    </section>
  );
}
