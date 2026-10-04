import { prepareBrandFiles } from "./brandAssets";
import { emptyResult } from "./context";
import type { SeedStep } from "./context";
import { renderOgImage, renderTexture } from "./imagery";
import { upsertMedia } from "./mediaStore";

/** Brand files, background textures and the default OG image (plan T7 §1). */
export const seedMedia: SeedStep = async (ctx) => {
  const result = emptyResult();
  const brand = await prepareBrandFiles(ctx);
  const siteName = ctx.site.companyName ?? "CT";

  const items = [
    {
      key: "logo",
      input: {
        alt: `${siteName} logo`,
        data: brand.logo,
        defaultFor: ["platform_default" as const],
        filename: "ct-logo.svg",
        folder: "Brand" as const,
      },
    },
    {
      key: "logoOnDark",
      input: {
        alt: `${siteName} logo`,
        data: brand.logoOnDark,
        filename: "ct-logo-on-dark.svg",
        folder: "Brand" as const,
      },
    },
    {
      key: "mark",
      input: {
        alt: `${siteName} mark`,
        data: brand.mark,
        filename: "ct-mark.svg",
        folder: "Brand" as const,
      },
    },
    {
      key: "og",
      input: {
        alt: siteName,
        data: await renderOgImage(siteName, "Open source system software experts"),
        filename: "ct-og-default.jpg",
        folder: "Brand" as const,
      },
    },
    ...(["dark-rings", "sand-grid", "green-band"] as const).map((kind) => ({
      key: `texture-${kind}`,
      input: {
        alt: `Background texture: ${kind.replace("-", " ")}`,
        data: Buffer.alloc(0),
        filename: `ct-bg-${kind}.jpg`,
        folder: "Background" as const,
        kind,
      },
    })),
  ];

  for (const item of items) {
    const input =
      "kind" in item.input
        ? { ...item.input, data: await renderTexture(item.input.kind) }
        : item.input;
    const { id, created } = await upsertMedia(ctx, input);
    ctx.ids.media.set(item.key, id);
    result[created ? "created" : "skipped"]++;
  }

  result.note = brand.placeholder ? "placeholder logo (brand/logo.svg missing)" : undefined;
  return result;
};
