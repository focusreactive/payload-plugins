import { getTranslations } from "next-intl/server";

import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/types";
import { getPathMap } from "@/dal/pathMap";
import { Eyebrow } from "@/components/Eyebrow";
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
      <nav aria-label={t("inThisSection")} className="border-border border-t pt-10 pb-16">
        <Eyebrow tone="muted" prefix="none" className="mb-6">
          {t("inThisSection")}
        </Eyebrow>
        <ul className="flex flex-col gap-6">
          {children.map((child) => (
            <li key={child.id}>
              <Link
                href={child.url}
                locale={locale}
                className="text-primary underline decoration-1 underline-offset-4 hover:text-primary-hover"
              >
                {child.title}
              </Link>
              {child.description && (
                <p className="text-muted-foreground mt-1 text-[0.875rem] leading-[1.45]">
                  {child.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </Container>
  );
}
