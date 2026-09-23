import { getTranslations } from "next-intl/server";

import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/types";
import { getPathMap } from "@/dal/pathMap";
import { ArrowRight } from "@untitledui/icons";
import { Container } from "@/components/shared";

interface Props {
  pageId: number;
  locale: Locale;
}

/**
 * Lists this page's direct published children, in this locale only. Built
 * from `childrenByParentId` (see pathMap.ts), which a child never enters
 * unless it was actually translated here - a page with real children in
 * another locale but none in this one renders nothing, same rule as
 * Breadcrumbs and for the same reason.
 */
export async function ChildPages({ pageId, locale }: Props) {
  const pathMap = await getPathMap();
  const children = pathMap.childrenByParentId[pageId]?.[locale];

  if (!children || children.length === 0) {
    return null;
  }

  const t = await getTranslations("hierarchyNav");

  return (
    <Container containerData={{}}>
      {/* Same card treatment as the CardsGrid icon cards, so this list reads as one of the page's sections rather than a sitemap. */}
      <nav aria-label={t("inThisSection")} className="pt-12 pb-16 md:pt-16 md:pb-24">
        <span className="text-sm font-semibold text-brand-secondary md:text-md">
          {t("inThisSection")}
        </span>
        <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {children.map((child) => (
            <li key={child.id}>
              <Link
                href={child.url}
                locale={locale}
                className="group flex h-full flex-col gap-2 bg-surface-raised p-5 ring-1 ring-secondary_alt transition hover:ring-border-brand md:p-6"
              >
                <span className="flex items-center justify-between gap-4 text-lg font-semibold text-primary">
                  {child.title}
                  <ArrowRight className="size-5 shrink-0 text-fg-brand-primary transition group-hover:translate-x-0.5" />
                </span>
                {child.description && (
                  <span className="text-md text-pretty text-tertiary">{child.description}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Container>
  );
}
