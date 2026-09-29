/**
 * One breakpoint for the whole header, declared once because four call sites read it and a drift
 * between them shows as a row with no navigation at all. Measured at the design's own sizes: the
 * logo, five labels, the call to action and the three square controls need about 1060px before the
 * row wraps onto a second line, which the design permits but reads as broken.
 */
export const DESKTOP_NAV_VISIBLE = "min-[1100px]:flex";
export const DESKTOP_NAV_HIDDEN = "min-[1100px]:hidden";
