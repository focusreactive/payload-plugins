"use client";

import { ArrowRight, ZapFast } from "@untitledui/icons";
import { Button } from "@/shared/ui/shadcn/base/buttons/button";
import { FeaturedIcon } from "@/shared/ui/shadcn/foundations/featured-icon/featured-icon";

export const MetricsSimpleAccentLine = () => {
  return (
    <section className="bg-primary py-16 md:py-24">
      <div className="mx-auto max-w-container px-4 md:px-8">
        <div className="flex flex-col gap-12 md:gap-16">
          <div className="flex w-full flex-col items-center self-center text-center md:max-w-3xl">
            <FeaturedIcon icon={ZapFast} color="gray" theme="modern" size="xl" />

            <h2 className="mt-4 text-display-sm font-semibold text-primary md:mt-6 md:text-display-md">
              Build something great
            </h2>
            <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">
              Everything you need to build modern UI and great products.
            </p>
          </div>
          <dl className="flex flex-col justify-between gap-10 md:flex-row md:gap-8">
            {[
              {
                title: "400+",
                subtitle: "Projects completed",
                description: "We've helped build over 400 amazing projects.",
                cta: "View projects",
                href: "#",
              },
              {
                title: "600%",
                subtitle: "Return on investment",
                description: "Our customers have reported an average of ~600% ROI.",
                cta: "Learn more",
                href: "#",
              },
              {
                title: "10k",
                subtitle: "Global downloads",
                description: "Our free UI kit has been downloaded over 10k times.",
                cta: "Download now",
                href: "#",
              },
              {
                title: "200+",
                subtitle: "5-star reviews",
                description: "We're proud of our 5-star rating with over 200 reviews.",
                cta: "View reviews",
                href: "#",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="relative flex-1 overflow-hidden pt-4 md:mt-0 md:pt-0 md:pl-6.5"
              >
                <div className="absolute top-0 left-0 h-full w-full border-t-2 border-fg-brand-primary_alt md:border-t-0 md:border-l-2"></div>
                <div className="flex items-start justify-between gap-4 md:-ml-0.5 md:flex-col">
                  <div className="flex flex-col-reverse gap-1">
                    <dt className="text-lg font-semibold text-primary">{item.subtitle}</dt>
                    <dd className="text-display-lg font-semibold text-brand-tertiary_alt">
                      {item.title}
                    </dd>
                  </div>
                  <Button color="link-color" size="lg" href={item.href} iconTrailing={ArrowRight}>
                    {item.cta}
                  </Button>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
};
