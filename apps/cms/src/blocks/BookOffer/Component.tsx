import { BookOffer } from "./ui";
import { SectionContainer } from "@/components/shared";
import type { BookOfferBlock } from "@/payload-types";

export const BookOfferBlockComponent: React.FC<BookOfferBlock> = ({
  eyebrow,
  heading,
  description,
  emailPlaceholder,
  submitLabel,
  successMessage,
  cover,
  section,
  id,
}) => {
  const uploadedCover = cover?.image && typeof cover.image === "object" ? cover.image : null;

  return (
    <SectionContainer sectionData={{ ...section, id }}>
      <BookOffer
        coverAlt={uploadedCover?.alt ?? `Cover of ${heading}`}
        coverHeight={uploadedCover?.height ?? undefined}
        coverSrc={uploadedCover?.url ?? undefined}
        coverWidth={uploadedCover?.width ?? undefined}
        description={description}
        emailPlaceholder={emailPlaceholder}
        eyebrow={eyebrow}
        heading={heading}
        submitLabel={submitLabel}
        successMessage={successMessage}
      />
    </SectionContainer>
  );
};
