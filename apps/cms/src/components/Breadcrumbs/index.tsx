import { getTranslations } from "next-intl/server";

import { Link } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/types";
import { getPathMap } from "@/dal/pathMap";
import { Container } from "@/components/shared";

interface Props {
  pageId: number;
  locale: Locale;
}

/**
 * Reads the ancestor chain from `idToBreadcrumbs`, which is keyed off the
 * nested-docs plugin's own per-locale labels (see pathMap.ts) rather than
 * re-deriving parents from the slug. A page whose chain is missing or has no
 * ancestors for this locale renders nothing - a chain in the wrong language
 * would misstate the very thing this component exists to show, so there is
 * no English fallback here.
 */
export async function Breadcrumbs({ pageId, locale }: Props) {
  const pathMap = await getPathMap();
  const chain = pathMap.idToBreadcrumbs[pageId]?.[locale];

  if (!chain || chain.length <= 1) {
    return null;
  }

  const t = await getTranslations("hierarchyNav");
  const ancestors = chain.slice(0, -1);
  const current = chain.at(-1)!;

  return (
    <Container containerData={{}} className="pt-8">
      <nav aria-label={t("breadcrumbLabel")} className="mb-6 text-[0.8125rem] leading-[1.45]">
        <ol className="flex flex-wrap items-center gap-x-2">
          {ancestors.map((crumb) => (
            <li key={crumb.url} className="flex items-center gap-x-2">
              <Link
                href={crumb.url}
                locale={locale}
                className="text-primary underline decoration-1 underline-offset-4 hover:text-primary-hover"
              >
                {crumb.label}
              </Link>
              <span aria-hidden className="text-[var(--color-ink-tertiary)]">
                /
              </span>
            </li>
          ))}
          <li aria-current="page" className="text-muted-foreground">
            {current.label}
          </li>
        </ol>
      </nav>
    </Container>
  );
}
