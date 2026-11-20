import { WIDGET_SLUG } from "./lib/constants.js";

/** Widths the widget allows; it needs at least `medium` to stay readable. */
type WidgetWidth = "full" | "large" | "medium" | "x-large";

/**
 * Entry for `admin.dashboard.defaultLayout` that puts the "Content model" graph widget on the
 * admin home page.
 */
export const relationsGraphWidget = (
  options: { globals?: boolean; uploads?: boolean; width?: WidgetWidth } = {}
) => ({
  data: { globals: options.globals ?? true, uploads: options.uploads ?? true },
  widgetSlug: WIDGET_SLUG,
  width: options.width ?? ("full" as WidgetWidth),
});
