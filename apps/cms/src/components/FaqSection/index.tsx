import type { SerializedEditorState } from "@payloadcms/richtext-lexical/lexical";

import { RichText } from "@/components/shared";

import { FaqQuestion } from "./FaqQuestion";

export interface FaqSectionItem {
  question: string;
  answer: SerializedEditorState;
  id?: string | null;
}

interface FaqSectionProps {
  eyebrow?: string | null;
  heading?: string | null;
  description?: string | null;
  items?: FaqSectionItem[] | null;
}

/**
 * Untitled UI's faq-accordion-03: heading on the left, questions on the right, the first one
 * open. Section padding and container are theirs, so the block renders with none of its own.
 */
export function FaqSection({ eyebrow, heading, description, items }: FaqSectionProps) {
  return (
    <div className="py-16 md:py-24">
      <div className="mx-auto max-w-container px-4 md:px-8">
        <div className="flex flex-col gap-12 lg:flex-row lg:gap-16">
          {(eyebrow || heading || description) && (
            <div className="flex w-full max-w-3xl flex-col lg:max-w-xl">
              {eyebrow && (
                <span className="text-sm font-semibold text-brand-secondary md:text-md">
                  {eyebrow}
                </span>
              )}
              {heading && (
                <h2 className="mt-3 text-display-sm font-semibold text-primary md:text-display-md">
                  {heading}
                </h2>
              )}
              {description && <p className="mt-4 text-lg text-tertiary md:mt-5">{description}</p>}
            </div>
          )}
          <div className="flex w-full flex-col gap-8">
            {(items ?? []).map((item, index) => (
              <FaqQuestion
                key={item.id ?? index}
                question={item.question}
                defaultOpen={index === 0}
              >
                <RichText content={item.answer} />
              </FaqQuestion>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
