export type WindowWithGtag = Window & { gtag: NonNullable<Window["gtag"]> };

export const canUseGtag = (window: Window): window is WindowWithGtag => typeof window !== "undefined" && typeof window.gtag === "function";
