import { Button } from "@/shared/ui/shadcn/base/buttons/button";

export const CTASimpleCentered = () => {
  return (
    <section className="bg-primary py-16 md:py-24">
      <div className="mx-auto max-w-container px-4 md:px-8">
        <div className="flex flex-col justify-center text-center">
          <h2 className="text-display-sm font-semibold text-primary md:text-display-md">
            Start your free trial
          </h2>
          <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">
            Join over 4,000+ startups already growing with Untitled.
          </p>
          <div className="mt-8 flex flex-col-reverse gap-3 self-stretch md:mt-8 md:flex-row md:self-center">
            <Button color="secondary" size="xl">
              Learn more
            </Button>
            <Button size="xl">Get started</Button>
          </div>
        </div>
      </div>
    </section>
  );
};
