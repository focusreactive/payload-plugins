import React from "react";

import { createPersonSchema } from "@/components/seo/schemas";
import { getPayloadClient } from "@/lib/dal";
import type { Person } from "@/payload-types";

import { JsonLd } from "../JsonLd";

interface PersonJsonLdProps {
  person: Person;
  profileUrl: string | null;
  locale: string;
}

export async function PersonJsonLd({ person, profileUrl, locale }: PersonJsonLdProps) {
  const serviceIds = (person.services ?? []).map((service) =>
    typeof service === "object" ? service.id : service
  );
  const services =
    serviceIds.length > 0
      ? (
          await (
            await getPayloadClient()
          ).find({
            collection: "page",
            locale: locale as "en",
            where: { id: { in: serviceIds } },
            limit: serviceIds.length,
            depth: 0,
            select: { title: true },
          })
        ).docs
      : [];
  const serviceNames = services.flatMap((service) => (service.title ? [service.title] : []));
  return <JsonLd data={createPersonSchema({ person, profileUrl, serviceNames })} />;
}
