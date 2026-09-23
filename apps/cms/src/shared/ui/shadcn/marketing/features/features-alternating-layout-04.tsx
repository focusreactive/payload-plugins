"use client";

import { ChartBreakoutSquare, MessageChatCircle, ZapFast } from "@untitledui/icons";
import { FeaturedIcon } from "@/shared/ui/shadcn/foundations/featured-icon/featured-icon";
import { CheckItemText } from "@/shared/ui/shadcn/marketing/pricing-sections/base-components/pricing-tier-card";

export const FeaturesAlternatingLayout04 = () => {
  return (
    <section className="flex flex-col gap-12 bg-primary py-16 sm:gap-16 md:gap-20 md:py-24 lg:gap-24">
      <div className="mx-auto w-full max-w-container px-4 md:px-8">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
          <span className="text-sm font-semibold text-brand-secondary md:text-md">Features</span>
          <h2 className="mt-3 text-display-sm font-semibold text-primary md:text-display-md">
            Beautiful analytics to grow smarter
          </h2>
          <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">
            Powerful, self-serve product and growth analytics to help you convert, engage, and
            retain more users. Trusted by over 4,000 startups.
          </p>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-container flex-col gap-12 px-4 sm:gap-16 md:gap-20 md:px-8 lg:gap-24 lg:px-0">
        <div className="grid grid-cols-1 gap-10 md:gap-20 lg:grid-cols-2 lg:gap-0">
          <div className="flex-1 self-center lg:py-24 lg:pr-24 lg:pl-12">
            <FeaturedIcon icon={MessageChatCircle} color="brand" size="lg" theme="light" />

            <h2 className="mt-5 text-display-xs font-semibold text-primary md:text-display-sm">
              Share team inboxes
            </h2>
            <p className="mt-2 text-md text-tertiary md:mt-4 md:text-lg">
              Whether you have a team of 2 or 200, our shared team inboxes keep everyone on the same
              page and in the loop.
            </p>
            <ul className="mt-8 flex flex-col gap-4 pl-2 md:gap-5 md:pl-4">
              {[
                "Leverage automation to move fast",
                "Always give customers a human to chat to",
                "Automate customer support and close leads faster",
              ].map((feat) => (
                <CheckItemText
                  key={feat}
                  size="md"
                  iconStyle="contained"
                  color="primary"
                  text={feat}
                />
              ))}
            </ul>
          </div>

          <div className="relative min-h-60 w-full flex-1 md:min-h-140">
            <img
              src="https://www.untitledui.com/marketing/ai-woman-01.webp"
              alt="AI Woman 01"
              className="absolute inset-0 size-full object-cover lg:right-auto lg:w-[50vw] lg:max-w-[50vw]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 md:gap-20 lg:grid-cols-2 lg:gap-0">
          <div className="flex-1 self-center lg:order-last lg:py-24 lg:pr-8 lg:pl-24">
            <FeaturedIcon icon={ZapFast} color="brand" size="lg" theme="light" />

            <h2 className="mt-5 text-display-xs font-semibold text-primary md:text-display-sm">
              Deliver instant answers
            </h2>
            <p className="mt-2 text-md text-tertiary md:mt-4 md:text-lg">
              An all-in-one customer service platform that helps you balance everything your
              customers need to be happy.
            </p>
            <ul className="mt-8 flex flex-col gap-4 pl-2 md:gap-5 md:pl-4">
              {[
                "Keep your customers in the loop with live chat",
                "Embed help articles right on your website",
                "Customers never have to leave the page to find an answer",
              ].map((feat) => (
                <CheckItemText
                  key={feat}
                  size="md"
                  iconStyle="contained"
                  color="primary"
                  text={feat}
                />
              ))}
            </ul>
          </div>

          <div className="relative min-h-60 w-full flex-1 md:min-h-140">
            <img
              src="https://www.untitledui.com/marketing/ai-woman-02.webp"
              alt="AI Woman 02"
              className="absolute inset-0 size-full object-cover lg:left-auto lg:w-[50vw] lg:max-w-[50vw]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 md:gap-20 lg:grid-cols-2 lg:gap-0">
          <div className="flex-1 self-center lg:py-24 lg:pr-24 lg:pl-12">
            <FeaturedIcon icon={ChartBreakoutSquare} color="brand" size="lg" theme="light" />

            <h2 className="mt-5 text-display-xs font-semibold text-primary md:text-display-sm">
              Manage your team with reports
            </h2>
            <p className="mt-2 text-md text-tertiary md:mt-4 md:text-lg">
              Measure what matters with Untitled's easy-to-use reports. You can filter, export, and
              drilldown on the data in a couple clicks.
            </p>
            <ul className="mt-8 flex flex-col gap-4 pl-2 md:gap-5 md:pl-4">
              {[
                "Filter, export, and drilldown on the data quickly",
                "Save, schedule, and automate reports to your inbox",
                "Connect the tools you already use with 100+ integrations",
              ].map((feat) => (
                <CheckItemText
                  key={feat}
                  size="md"
                  iconStyle="contained"
                  color="primary"
                  text={feat}
                />
              ))}
            </ul>
          </div>

          <div className="relative min-h-60 w-full flex-1 md:min-h-140">
            <img
              src="https://www.untitledui.com/marketing/ai-woman-03.webp"
              alt="AI Woman 03"
              className="absolute inset-0 size-full object-cover lg:right-auto lg:w-[50vw] lg:max-w-[50vw]"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
