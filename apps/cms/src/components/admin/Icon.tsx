import Image from "next/image";
import React from "react";

import { Media } from "@/components/media";
import { getAdminSettings } from "@/dal/getAdminSettings";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import type { Media as MediaType } from "@/payload-types";

export default async function Icon() {
  const settings = await getAdminSettings();

  const icon = settings?.icon as MediaType | null;

  if (icon) {
    const media = prepareMediaProps({ image: icon });
    return (
      <Media {...media.data} imageProps={{ ...media.imageProps, className: "object-contain" }} />
    );
  }

  return <Image src="/favicon.svg" alt="Icon" width={32} height={32} />;
}
