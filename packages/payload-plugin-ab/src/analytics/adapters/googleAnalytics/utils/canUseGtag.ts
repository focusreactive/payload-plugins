export type WindowWithGtag = Window & { gtag: NonNullable<Window["gtag"]> };

export const canUseGtag = (window: Window): window is WindowWithGtag => {
  return typeof window !== "undefined" && typeof window.gtag === "function";
};
