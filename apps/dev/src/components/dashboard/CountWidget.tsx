import { Link } from "@payloadcms/ui";
import type { WidgetServerProps } from "payload";
import { formatAdminURL } from "payload/shared";

import {
  collectionLabel,
  countDocuments,
  findCollection,
  hasDrafts,
} from "../../lib/dashboard/data";
import {
  buildConditions,
  defaultHeading,
  periodCaption,
  periodDays,
  toListQuery,
} from "../../lib/dashboard/query";
import type { CountSettings } from "../../lib/dashboard/query";
import { DASHBOARD_CSS, STYLE_HREF } from "./styles";

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="dw">
    <style href={STYLE_HREF} precedence="default">
      {DASHBOARD_CSS}
    </style>
    {children}
  </div>
);

/** One number: how many documents of a collection match a status, a period and a field filter. */
export const CountWidget = async ({ permissions, req, widgetData }: WidgetServerProps) => {
  const settings = (widgetData ?? {}) as CountSettings;
  const collection = findCollection(req, settings.collection);

  if (!collection) {
    return (
      <Frame>
        <h3 className="dw__label">Document count</h3>
        <span className="dw__caption">Pick a collection in the widget settings.</span>
      </Frame>
    );
  }

  const label = settings.label?.trim() || defaultHeading(settings, collectionLabel(collection));

  if (!permissions?.collections?.[collection.slug]?.read) {
    return (
      <Frame>
        <h3 className="dw__label">{label}</h3>
        <span className="dw__caption">You do not have access to this collection.</span>
      </Frame>
    );
  }

  const now = new Date();
  const drafts = hasDrafts(collection);
  const conditions = buildConditions(settings, { hasDrafts: drafts, now });
  // A trend only makes sense for creation dates: an update moves a document out of the
  // earlier window, so "updated the week before" would always undercount.
  const withTrend = periodDays(settings.period) !== null && settings.dateField === "createdAt";

  const [count, previous] = await Promise.all([
    countDocuments(req, collection, conditions),
    withTrend
      ? countDocuments(
          req,
          collection,
          buildConditions(settings, { hasDrafts: drafts, now, window: "previous" })
        )
      : null,
  ]);

  const href = `${formatAdminURL({
    adminRoute: req.payload.config.routes.admin,
    path: `/collections/${collection.slug}`,
  })}${conditions.length > 0 ? `?${toListQuery(conditions)}` : ""}`;

  const delta = count !== null && previous !== null ? count - previous : null;

  return (
    <Frame>
      <h3 className="dw__label">{label}</h3>
      {count === null ? (
        <>
          <span className="dw__value dw__value--muted">–</span>
          <span className="dw__caption">Could not count. Check the filter field name.</span>
        </>
      ) : (
        <>
          <span className="dw__value">{count.toLocaleString(req.i18n.language)}</span>
          <span className="dw__caption">
            {periodCaption(settings)}
            {delta === null ? null : (
              <>
                {" · "}
                <span className="dw__trend">
                  {delta > 0 ? `+${delta}` : delta === 0 ? "same" : delta}
                </span>
                {delta === 0 ? " as" : " vs"} the period before
              </>
            )}
          </span>
          <Link className="dw__link" href={href} prefetch={false}>
            View list →
          </Link>
        </>
      )}
    </Frame>
  );
};
