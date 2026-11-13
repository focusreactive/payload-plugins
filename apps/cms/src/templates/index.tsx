import type { Metadata } from "next";
import React from "react";

import { getEntityBySlug, getSiteChrome } from "@/dal/entities";
import { entityPath, withLocalePrefix } from "@/lib/config/entityRoutes";
import type { EntityRouteMatch } from "@/lib/config/entityRoutes";
import { I18N_CONFIG } from "@/lib/config/i18n";
import type { Locale } from "@/lib/types";
import { getServerSideURL } from "@/lib/utils/getURL";
import type { Clinic, Condition, Doctor, Media, State, Treatment } from "@/payload-types";
import { stripMarkers } from "@focus-reactive/payload-plugin-visual-editing";

import { ClinicTemplate } from "./clinic";
import { ConditionTemplate } from "./condition";
import { DoctorTemplate } from "./doctor";
import { StateTemplate } from "./state";
import { TreatmentTemplate } from "./treatment";

type EntityDoc = State | Clinic | Doctor | Treatment | Condition;

interface ResolvedEntity {
  match: EntityRouteMatch;
  doc: EntityDoc;
  path: string;
}

/** Finds the record a URL points at. A clinic must sit under its own state's slug. */
export async function resolveEntity(
  match: EntityRouteMatch,
  locale: Locale
): Promise<ResolvedEntity | null> {
  const doc = await getEntityBySlug(match.collection, match.slug, locale);

  if (!doc) {
    return null;
  }

  if (match.collection === "clinics") {
    const { state } = doc as Clinic;
    const stateSlug = typeof state === "object" ? stripMarkers(state?.slug) : null;

    if (stateSlug !== match.stateSlug) {
      return null;
    }
  }

  const path = entityPath({
    collection: match.collection,
    slug: match.slug,
    stateSlug: match.collection === "clinics" ? match.stateSlug : undefined,
  });

  return path ? { doc, match, path } : null;
}

export async function renderEntityPage(
  { match, doc, path }: ResolvedEntity,
  locale: Locale
): Promise<React.ReactNode> {
  const chrome = await getSiteChrome(locale);
  const shared = { footer: chrome.footer, header: chrome.header, locale, path };

  switch (match.collection) {
    case "states": {
      return <StateTemplate doc={doc as State} {...shared} />;
    }
    case "clinics": {
      return <ClinicTemplate doc={doc as Clinic} {...shared} />;
    }
    case "doctors": {
      return <DoctorTemplate doc={doc as Doctor} {...shared} />;
    }
    case "treatments": {
      return <TreatmentTemplate doc={doc as Treatment} {...shared} />;
    }
    case "conditions": {
      return <ConditionTemplate doc={doc as Condition} {...shared} />;
    }
  }
}

const titleOf = (doc: EntityDoc): string => {
  const named = doc as { name?: string | null; title?: string | null; heroTitle?: string | null };

  return stripMarkers(doc.meta?.title || named.heroTitle || named.title || named.name) ?? "";
};

export function generateEntityMetadata({ doc, path }: ResolvedEntity, locale: Locale): Metadata {
  const baseUrl = getServerSideURL();
  const image =
    doc.meta?.image && typeof doc.meta.image === "object" ? (doc.meta.image as Media) : null;
  const title = titleOf(doc);
  const description = stripMarkers(doc.meta?.description) ?? undefined;

  return {
    alternates: {
      canonical: `${baseUrl}${withLocalePrefix(path, locale)}`,
      languages: Object.fromEntries(
        I18N_CONFIG.locales.map(({ code }) => [code, `${baseUrl}${withLocalePrefix(path, code)}`])
      ),
    },
    description,
    openGraph: {
      description,
      images: image?.url ? [{ url: image.url }] : undefined,
      title,
      url: `${baseUrl}${withLocalePrefix(path, locale)}`,
    },
    robots: doc.meta?.robots === "noindex" ? { follow: false, index: false } : undefined,
    title: { absolute: title },
  };
}
