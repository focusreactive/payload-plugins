import { ArrowRight } from "@untitledui/icons";

import { AnimatedStatValue } from "@/components/demo/AnimatedStatValue";
import { cn } from "@/components/utils";
import { Button } from "@/shared/ui/shadcn/base/buttons/button";

import { StatsTabs } from "./StatsTabs";

export interface StatItem {
  value: string;
  label: string;
  description?: string | null;
  link?: { href: string; text: string } | null;
}

interface StatsProps {
  eyebrow?: string | null;
  heading?: string | null;
  description?: string | null;
  layout: "accentLine" | "splitImage";
  /** The image layout's screenshots, one per item. */
  images: React.ReactNode[];
  items: StatItem[];
}

// A word such as "Client liaison" at the figures' display size wraps and dwarfs the numbers
// beside it, so a value with no digit steps down one size.
function valueClassName(value: string, size: "large" | "extraLarge") {
  if (!/\d/u.test(value))
    return "text-display-sm font-semibold text-brand-tertiary_alt md:text-display-md";
  return size === "extraLarge"
    ? "text-display-lg font-semibold text-brand-tertiary_alt md:text-display-xl"
    : "text-display-lg font-semibold text-brand-tertiary_alt";
}

function SectionHeading({
  eyebrow,
  heading,
  description,
  centered,
}: Pick<StatsProps, "eyebrow" | "heading" | "description"> & { centered: boolean }) {
  if (!eyebrow && !heading && !description) return null;
  return (
    <div
      className={cn(
        "flex w-full flex-col md:max-w-3xl",
        centered && "items-center self-center text-center"
      )}
    >
      {eyebrow && (
        <p className="text-sm font-semibold text-brand-secondary md:text-md">{eyebrow}</p>
      )}
      {heading && (
        <h2 className="mt-3 text-display-sm font-semibold text-primary md:text-display-md">
          {heading}
        </h2>
      )}
      {description && (
        <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">{description}</p>
      )}
    </div>
  );
}

/**
 * Untitled UI's metrics-simple-accent-line and features-tabs-mockup-05, markup kept from their
 * source with the hardcoded rows replaced by CMS items. The accent-line variant also renders the
 * item description, which their data carries but that layout leaves out: every figure on this site
 * needs its source stated beside it.
 */
export function Stats({ eyebrow, heading, description, layout, images, items }: StatsProps) {
  if (!items.length) return null;

  if (layout === "splitImage") {
    return (
      <div className="py-16 md:py-24">
        <div className="mx-auto max-w-container px-4 md:px-8">
          <div className="flex flex-col gap-12 md:gap-16">
            <SectionHeading
              eyebrow={eyebrow}
              heading={heading}
              description={description}
              centered={false}
            />
            <StatsTabs items={items} images={images} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-16 md:py-24">
      <div className="mx-auto max-w-container px-4 md:px-8">
        <div className="flex flex-col gap-12 md:gap-16">
          <SectionHeading eyebrow={eyebrow} heading={heading} description={description} centered />
          <dl className="flex flex-col justify-between gap-10 md:flex-row md:gap-8">
            {items.map((item, index) => (
              <div
                key={index}
                className="relative flex-1 overflow-hidden pt-4 md:mt-0 md:pt-0 md:pl-6.5"
              >
                <div className="absolute top-0 left-0 h-full w-full border-t-2 border-fg-brand-primary_alt md:border-t-0 md:border-l-2" />
                <div className="flex h-full flex-col gap-4 md:-ml-0.5">
                  <div className="flex flex-col-reverse gap-1">
                    <dt className="text-lg font-semibold text-balance text-primary">
                      {item.label}
                    </dt>
                    <dd className={valueClassName(item.value, "large")}>
                      <AnimatedStatValue value={item.value} />
                    </dd>
                  </div>
                  {item.description && (
                    <p className="text-md text-pretty text-tertiary">{item.description}</p>
                  )}
                  {item.link && (
                    <Button
                      color="link-color"
                      size="lg"
                      href={item.link.href}
                      // An element, not the component: Button is a client component and this file
                      // renders on the server, where a function prop cannot cross that boundary.
                      iconTrailing={
                        <ArrowRight
                          data-icon="trailing"
                          className="pointer-events-none size-5 shrink-0 transition-inherit-all"
                        />
                      }
                      className="mt-auto self-start"
                    >
                      {item.link.text}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
