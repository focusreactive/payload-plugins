import { Footer as SharedFooter } from "@repo/ui";
import { ImageAspectRatio } from "@repo/ui/components/ui/image/types";
import React from "react";

import { resolveLocale } from "@/core/lib/resolveLocale";
import { prepareImageProps } from "@/lib/adapters/prepareImageProps";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import { prepareRichTextProps } from "@/lib/adapters/prepareRichTextProps";
import type { Footer as FooterType, Media } from "@/payload-types";

interface Props {
  data: FooterType;
}

export async function Footer({ data }: Props) {
  if (!data) {return null;}

  const locale = await resolveLocale();
  const links = (data.links ?? []).map((item) =>
    prepareLinkProps(item.link, locale)
  );
  const image = prepareImageProps({
    aspectRatio: ImageAspectRatio["1/1"],
    image: data.logo as Media,
  });
  const text = prepareRichTextProps(data.text ?? null);

  return (
    <SharedFooter
      links={links}
      image={image}
      text={text}
      copywriteText={data.copywriteText ?? undefined}
    />
  );
}
