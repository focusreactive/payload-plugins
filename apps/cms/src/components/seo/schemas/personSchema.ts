import { MARKET_OPTIONS } from "@/lib/fields/marketsField";
import { getServerSideURL } from "@/lib/utils/getURL";
import type { Media, Person } from "@/payload-types";

interface PersonSchemaParams {
  person: Person;
  profileUrl: string | null;
  serviceNames: string[];
}

const FIRM = { "@type": "Organization", name: "Marks & Clerk", url: getServerSideURL() };

export function createPersonSchema({ person, profileUrl, serviceNames }: PersonSchemaParams) {
  const baseUrl = getServerSideURL();
  const photo = person.photo && typeof person.photo === "object" ? (person.photo as Media) : null;
  const marketNames = (person.markets ?? []).flatMap((value) => {
    const label = MARKET_OPTIONS.find((option) => option.value === value)?.label;
    return label ? [label] : [];
  });

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: person.name,
    ...(profileUrl && { url: `${baseUrl}${profileUrl}` }),
    ...(person.jobTitle && { jobTitle: person.jobTitle }),
    worksFor: FIRM,
    ...(person.office && {
      workLocation: { "@type": "Place", name: person.office },
    }),
    ...(photo?.url && { image: `${baseUrl}${photo.url}` }),
    ...((person.standfirst || person.biography) && {
      description: person.standfirst || person.biography,
    }),
    ...(marketNames.length > 0 && {
      areaServed: marketNames.map((name) => ({ "@type": "Place", name })),
    }),
    ...(serviceNames.length > 0 && { knowsAbout: serviceNames }),
  };
}
