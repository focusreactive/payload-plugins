import { Header as SharedHeader } from "@repo/ui";
import { AlignVariant } from "@repo/ui/components/sections/header/types";
import { ImageAspectRatio } from "@repo/ui/components/ui/image/types";
import React from "react";

import { resolveLocale } from "@/core/lib/resolveLocale";
import { prepareImageProps } from "@/lib/adapters/prepareImageProps";
import { prepareLinkProps } from "@/lib/adapters/prepareLinkProps";
import type { Header as HeaderType, Media } from "@/payload-types";

interface Props {
  data: HeaderType;
}

export async function Header({ data }: Props) {
  if (!data) {return null;}

  const locale = await resolveLocale();
  const links = (data.navItems ?? []).map((item) =>
    prepareLinkProps(item.link, locale)
  );
  const image = prepareImageProps({
    aspectRatio: ImageAspectRatio["1/1"],
    image: data.logo as Media,
  });

  return (
    <SharedHeader
      links={links}
      image={image}
      alignVariant={AlignVariant.Right}
    />
  );
}
