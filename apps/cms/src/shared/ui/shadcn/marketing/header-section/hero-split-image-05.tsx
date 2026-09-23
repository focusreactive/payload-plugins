"use client";

import { PlayCircle } from "@untitledui/icons";
import { Button } from "@/shared/ui/shadcn/base/buttons/button";
import { Header } from "@/shared/ui/shadcn/marketing/header-navigation/header";

export const HeroSplitImage05 = () => {
  return (
    <div className="relative overflow-hidden bg-primary">
      {/* Background pattern */}
      <img
        alt="Grid of dots"
        aria-hidden="true"
        loading="lazy"
        src="https://www.untitledui.com/patterns/light/grid-md-desktop.svg"
        className="pointer-events-none absolute top-0 left-1/2 z-0 hidden max-w-none -translate-x-1/2 md:block dark:brightness-[0.2]"
      />
      <img
        alt="Grid of dots"
        aria-hidden="true"
        loading="lazy"
        src="https://www.untitledui.com/patterns/light/grid-md-mobile.svg"
        className="pointer-events-none absolute top-0 left-1/2 z-0 max-w-none -translate-x-1/2 md:hidden dark:brightness-[0.2]"
      />

      <Header />

      <section className="py-16 md:pb-24">
        <div className="relative mx-auto grid max-w-container grid-cols-1 gap-16 px-4 md:px-8 lg:min-h-160 lg:items-center">
          <div className="z-10 flex max-w-200 flex-col items-start">
            <h1 className="text-display-md font-semibold text-primary md:text-display-lg lg:text-display-xl">
              Customer service software for customer-first teams
            </h1>
            <p className="mt-4 max-w-xl text-lg text-balance text-tertiary md:mt-6 md:text-xl">
              The best customer service software for customer-first teams. Industry-leading email
              and live chat support.{" "}
            </p>

            <div className="mt-8 flex w-full flex-col-reverse items-stretch gap-3 md:mt-12 md:flex-row md:items-start">
              <Button color="secondary" size="xl" iconLeading={PlayCircle}>
                Demo
              </Button>
              <Button size="xl">Sign up</Button>
            </div>
          </div>

          <div className="relative lg:absolute lg:top-0 lg:right-8 lg:h-full lg:w-140">
            <img
              className="inset-0 h-60 w-full rounded-tr-[32px] rounded-bl-[32px] object-cover md:h-110 md:rounded-tr-[64px] md:rounded-bl-[64px] lg:h-full"
              src="https://www.untitledui.com/marketing/workspace.webp"
              alt="Workspace"
            />
          </div>
        </div>
      </section>
    </div>
  );
};
