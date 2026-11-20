import { Link } from "@payloadcms/ui";
import type { WidgetServerProps } from "payload";
import { formatAdminURL } from "payload/shared";

import {
  collectionLabel,
  countDocuments,
  dashboardCollections,
  findCollection,
  hasDrafts,
} from "../../lib/dashboard/data";
import { buildConditions } from "../../lib/dashboard/query";
import { DASHBOARD_CSS, STYLE_HREF } from "./styles";

interface OverviewSettings {
  collections?: string[];
}

const cell = (value: number | null, language: string): string =>
  value === null ? "–" : value.toLocaleString(language);

/** One row per collection: total, drafts, published, and what moved in the last 7 days. */
export const OverviewWidget = async ({ permissions, req, widgetData }: WidgetServerProps) => {
  const settings = (widgetData ?? {}) as OverviewSettings;
  const chosen = settings.collections?.length
    ? settings.collections.flatMap((slug) => findCollection(req, slug) ?? [])
    : dashboardCollections(req);
  const collections = chosen.filter(
    (collection) => permissions?.collections?.[collection.slug]?.read
  );

  const now = new Date();
  const rows = await Promise.all(
    collections.map(async (collection) => {
      const drafts = hasDrafts(collection);
      const count = (settingsForRow: Parameters<typeof buildConditions>[0]) =>
        countDocuments(
          req,
          collection,
          buildConditions(settingsForRow, { hasDrafts: drafts, now })
        );
      const [total, draft, published, updated] = await Promise.all([
        count({}),
        drafts ? count({ status: "draft" }) : null,
        drafts ? count({ status: "published" }) : null,
        count({ dateField: "updatedAt", period: "7" }),
      ]);
      return { collection, draft, drafts, published, total, updated };
    })
  );

  const { language } = req.i18n;

  return (
    <div className="dw">
      <style href={STYLE_HREF} precedence="default">
        {DASHBOARD_CSS}
      </style>
      <h3 className="dw__title">Collections overview</h3>
      {rows.length === 0 ? (
        <span className="dw__caption">No collections to show.</span>
      ) : (
        <div className="dw__scroll">
          <table className="dw__table">
            <thead>
              <tr>
                <th>Collection</th>
                <th className="dw__num">Total</th>
                <th className="dw__num">Draft</th>
                <th className="dw__num">Published</th>
                <th className="dw__num">Updated, 7 days</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ collection, draft, drafts, published, total, updated }) => (
                <tr key={collection.slug}>
                  <td>
                    <Link
                      href={formatAdminURL({
                        adminRoute: req.payload.config.routes.admin,
                        path: `/collections/${collection.slug}`,
                      })}
                      prefetch={false}
                    >
                      {collectionLabel(collection)}
                    </Link>
                  </td>
                  <td className="dw__num">{cell(total, language)}</td>
                  <td className="dw__num dw__muted">{drafts ? cell(draft, language) : ""}</td>
                  <td className="dw__num dw__muted">{drafts ? cell(published, language) : ""}</td>
                  <td className="dw__num">{cell(updated, language)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
