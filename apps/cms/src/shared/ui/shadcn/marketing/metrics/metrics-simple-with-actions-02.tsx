"use client";

import { ChartBreakoutCircle, DownloadCloud02, PlayCircle, Stars02, Zap } from "@untitledui/icons";
import { Button } from "@/shared/ui/shadcn/base/buttons/button";
import { FeaturedIcon } from "@/shared/ui/shadcn/foundations/featured-icon/featured-icon";

export const MetricsSimpleWithActions02 = () => {
  return (
    <section className="bg-primary py-16 md:py-24">
      <div className="mx-auto max-w-container px-4 md:px-8">
        <div className="grid grid-cols-1 gap-12 md:gap-16 lg:grid-cols-2">
          <div className="flex flex-col items-start gap-8">
            <div className="flex flex-col">
              <h2 className="text-display-sm font-semibold text-primary md:text-display-md">
                Build something great
              </h2>
              <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">
                Everything you need to build modern UI and great products.
              </p>
            </div>
            <div className="hidden gap-3.5 md:flex">
              <Button iconLeading={PlayCircle} color="secondary" size="xl">
                Demo
              </Button>
              <Button size="xl">Get started</Button>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2 md:gap-y-12">
            {[
              {
                title: "400+",
                subtitle: "Projects completed",
                description: "We've helped build over 400 amazing projects.",
                icon: Zap,
              },
              {
                title: "600%",
                subtitle: "Return on investment",
                description: "Our customers have reported an average of ~600% ROI.",
                icon: ChartBreakoutCircle,
              },
              {
                title: "10k",
                subtitle: "Global downloads",
                description: "Our free UI kit has been downloaded over 10k times.",
                icon: DownloadCloud02,
              },
              {
                title: "200+",
                subtitle: "5-star reviews",
                description: "We're proud of our 5-star rating with over 200 reviews.",
                icon: Stars02,
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex flex-col items-center gap-4 text-center md:flex-row md:items-start md:gap-4 md:text-left"
              >
                <div className="md:pt-1">
                  <FeaturedIcon
                    icon={item.icon}
                    color="brand"
                    size="md"
                    theme="light"
                    className="inline-flex md:hidden"
                  />
                  <FeaturedIcon
                    icon={item.icon}
                    color="brand"
                    size="lg"
                    theme="light"
                    className="hidden md:inline-flex"
                  />
                </div>

                <div className="flex flex-1 flex-col-reverse gap-1">
                  <dt className="text-lg font-semibold text-primary">{item.subtitle}</dt>
                  <dd className="text-display-lg font-semibold text-brand-tertiary_alt">
                    {item.title}
                  </dd>
                </div>
              </div>
            ))}
          </dl>

          <div className="flex flex-col-reverse gap-3 md:hidden">
            <Button iconLeading={<PlayCircle className="size-5" />} color="secondary" size="xl">
              Demo
            </Button>
            <Button size="xl"> Get started</Button>
          </div>
        </div>
      </div>
    </section>
  );
};
