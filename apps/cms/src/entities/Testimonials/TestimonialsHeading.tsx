import { SectionHeader } from "@/core/ui";

interface Props {
  heading?: string | null;
  subheading?: string | null;
}

export const TestimonialsHeading: React.FC<Props> = ({ heading, subheading }) => {
  if (!heading && !subheading) {
    return null;
  }

  return (
    <div className="mx-auto mb-12 max-w-3xl text-center sm:mb-16">
      {heading && <SectionHeader heading={heading} eyebrow="Customer voices" align="center" />}
      {subheading && <p className="mx-auto -mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:-mt-10">{subheading}</p>}
    </div>
  );
};
