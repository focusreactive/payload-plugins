import Image from "next/image";
import React from "react";

import { Media } from "@/core/ui";
import { getSiteSettings } from "@/dal/getSiteSettings";
import type { Media as MediaType } from "@/payload-types";

export default async function Icon() {
  const settings = await getSiteSettings({});

  const icon = settings?.adminIcon as MediaType | null;

  if (icon) {
    return <Media resource={icon} imgClassName="object-contain" />;
  }

  return <Image src="/favicon.svg" alt="Icon" width={32} height={32} />;
}
