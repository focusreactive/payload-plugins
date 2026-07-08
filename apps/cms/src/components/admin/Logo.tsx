import Image from "next/image";
import React from "react";

import { Media } from "@/components/media";
import { getSiteSettings } from "@/dal/getSiteSettings";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import type { Media as MediaType } from "@/payload-types";

export default async function Logo() {
  const settings = await getSiteSettings({});

  const logo = settings?.adminLogo as MediaType;

  if (logo) {
    const media = prepareMediaProps({ image: logo });
    return (
      <div style={{ maxWidth: "150px", padding: "20px 0" }}>
        <Media
          {...media.data}
          imageProps={{ ...media.imageProps, className: "object-contain w-full h-auto" }}
        />
      </div>
    );
  }

  return (
    <div style={{ padding: "20px 0" }}>
      <Image src="/logo.svg" alt="Logo" width={150} height={40} />
    </div>
  );
}
