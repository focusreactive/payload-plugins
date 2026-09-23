import { cn } from "@/components/utils";
import type { SectionHeaderProps } from "@/components/SectionHeader";

interface CtaBandProps {
  header?: SectionHeaderProps | null;
  theme?: string | null;
  actions: React.ReactNode;
}

export function CtaBand({ header, actions }: CtaBandProps) {
  const HeadingTag = header?.isFirstBlock ? "h1" : "h2";

  return (
    <div className="flex flex-col justify-center text-center">
      {header && (
        <>
          {/* cta-simple-centered has no eyebrow slot at all - copied verbatim from
              features-alternating-layout-04, which pairs the same centered h2+p with one. */}
          {header.eyebrow?.text && (
            <span className="text-sm font-semibold text-brand-secondary md:text-md">
              {header.eyebrow.text}
            </span>
          )}
          {header.title && (
            <HeadingTag
              className={cn(
                "text-display-sm font-semibold text-primary md:text-display-md",
                header.eyebrow?.text && "mt-3"
              )}
            >
              {header.title}
            </HeadingTag>
          )}
          {header.subtitle && (
            <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">{header.subtitle}</p>
          )}
        </>
      )}
      <div className="mt-8 flex flex-col-reverse gap-3 self-stretch md:mt-8 md:flex-row md:self-center">
        {actions}
      </div>
    </div>
  );
}
