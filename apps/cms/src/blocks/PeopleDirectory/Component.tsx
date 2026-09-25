import { Media } from "@/components/media";
import { SectionContainer } from "@/components/shared";
import { getPayloadClient, getPersonHref } from "@/lib/dal";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";
import { pickStandfirst } from "@/lib/people/pickStandfirst";
import { resolveLocale } from "@/lib/utils/resolveLocale";
import type { PeopleDirectoryBlock } from "@/payload-types";
import type { Where } from "payload";

import { PeopleDirectory } from "./ui";
import type { PersonCard } from "./ui";

export async function PeopleDirectoryBlockComponent({
  eyebrow,
  heading,
  description,
  section,
  id,
  service,
  markets,
}: PeopleDirectoryBlock) {
  const locale = await resolveLocale();
  const payload = await getPayloadClient();
  const serviceId = service == null ? null : typeof service === "object" ? service.id : service;
  const listingMarkets = markets ?? [];

  const conditions: Where[] = [{ _status: { equals: "published" } }];
  if (serviceId !== null) conditions.push({ services: { equals: serviceId } });
  if (listingMarkets.length > 0) conditions.push({ markets: { in: listingMarkets } });

  const result = await payload.find({
    collection: "person",
    locale: locale as "en",
    where: { and: conditions },
    sort: "createdAt",
    limit: 200,
    depth: 1,
  });

  const cards: PersonCard[] = await Promise.all(
    result.docs.map(async (person) => {
      const media =
        person.photo && typeof person.photo === "object"
          ? prepareMediaProps({ image: person.photo, alt: person.name })
          : null;
      return {
        id: String(person.id),
        name: person.name,
        jobTitle: person.jobTitle,
        office: person.office ?? null,
        standfirst: pickStandfirst(person, { serviceId, markets: listingMarkets }),
        href: await getPersonHref(person, locale),
        // Rendered here rather than in the client grid, so the image pipeline stays on the server.
        photo: media ? (
          <Media
            {...media.data}
            className="absolute inset-0"
            imageProps={{
              ...media.imageProps,
              fit: "cover",
              fill: true,
              sizes: "112px",
              className: "object-top",
            }}
            visualEditing={media.visualEditing}
          />
        ) : null,
      };
    })
  );

  return (
    <SectionContainer
      sectionData={{ ...section, id, paddingY: "none", paddingX: "none", maxWidth: "none" }}
    >
      <PeopleDirectory
        eyebrow={eyebrow}
        heading={heading}
        description={description}
        cards={cards}
        allLabel={ALL_OFFICES_LABEL[locale] ?? ALL_OFFICES_LABEL.en}
      />
    </SectionContainer>
  );
}

const ALL_OFFICES_LABEL: Record<string, string> = {
  en: "All",
  fr: "Tous",
  ja: "すべて",
};
