import { Link, Pill } from "@payloadcms/ui";
import type { CollectionSlug, WidgetServerProps } from "payload";
import { formatAdminURL } from "payload/shared";

import {
  collectionLabel,
  dashboardCollections,
  findCollection,
  hasDrafts,
  relativeTime,
} from "../../lib/dashboard/data";
import { DASHBOARD_CSS, STYLE_HREF } from "./styles";

interface RecentSettings {
  collections?: string[];
  limit?: number;
}

interface RecentRow {
  collection: string;
  draft: boolean;
  href: string;
  id: number | string;
  title: string;
  updatedAt: string;
}

const DEFAULT_LIMIT = 8;

/** The most recently changed documents across collections, newest first. */
export const RecentWidget = async ({ permissions, req, widgetData }: WidgetServerProps) => {
  const settings = (widgetData ?? {}) as RecentSettings;
  const limit = Math.min(30, Math.max(1, settings.limit ?? DEFAULT_LIMIT));
  const chosen = settings.collections?.length
    ? settings.collections.flatMap((slug) => findCollection(req, slug) ?? [])
    : dashboardCollections(req);
  const collections = chosen.filter(
    (collection) => permissions?.collections?.[collection.slug]?.read
  );

  const perCollection = await Promise.all(
    collections.map(async (collection): Promise<RecentRow[]> => {
      const titleField = collection.admin?.useAsTitle ?? "id";
      try {
        const { docs } = await req.payload.find({
          collection: collection.slug as CollectionSlug,
          depth: 0,
          // Latest version, so a draft saved a minute ago shows up as changed.
          draft: hasDrafts(collection),
          limit,
          overrideAccess: false,
          req,
          sort: "-updatedAt",
        });
        return docs.map((doc) => {
          const record = doc as unknown as Record<string, unknown>;
          const title = record[titleField];
          return {
            collection: collectionLabel(collection),
            draft: record._status === "draft",
            href: formatAdminURL({
              adminRoute: req.payload.config.routes.admin,
              path: `/collections/${collection.slug}/${String(record.id)}`,
            }),
            id: `${collection.slug}:${String(record.id)}`,
            title: typeof title === "string" && title.length > 0 ? title : `#${String(record.id)}`,
            updatedAt: String(record.updatedAt),
          };
        });
      } catch {
        return [];
      }
    })
  );

  const rows = perCollection
    .flat()
    .toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
  const now = new Date();

  return (
    <div className="dw">
      <style href={STYLE_HREF} precedence="default">
        {DASHBOARD_CSS}
      </style>
      <h3 className="dw__title">Recent changes</h3>
      {rows.length === 0 ? (
        <span className="dw__caption">Nothing has been changed yet.</span>
      ) : (
        <div className="dw__scroll">
          <table className="dw__table">
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={row.href} prefetch={false}>
                      {row.title}
                    </Link>
                  </td>
                  <td className="dw__muted dw__nowrap">{row.collection}</td>
                  <td className="dw__nowrap">
                    {row.draft ? (
                      <Pill pillStyle="warning" size="small">
                        Draft
                      </Pill>
                    ) : null}
                  </td>
                  <td className="dw__num dw__muted dw__nowrap">
                    {relativeTime(row.updatedAt, now, req.i18n.language)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
