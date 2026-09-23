export const MetricsSplitImage01 = () => {
  return (
    <section className="bg-primary py-16 md:py-24">
      <div className="mx-auto max-w-container px-4 md:px-8">
        <div className="flex flex-col gap-12 md:gap-16">
          <div className="flex w-full flex-col md:max-w-3xl">
            <p className="text-sm font-semibold text-brand-secondary md:text-md">Launch faster</p>
            <h2 className="mt-3 text-display-sm font-semibold text-primary md:text-display-md">
              Build something great
            </h2>
            <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">
              Everything you need to build modern UI and great products. We've done all the heavy
              lifting so you don't have to—the perfect starting point for any project.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-12 md:gap-8 lg:grid-cols-2">
            <dl className="grid grid-cols-1 gap-8 self-center md:grid-cols-2 md:gap-y-16 md:pr-8">
              {[
                {
                  title: "400+",
                  subtitle: "Projects completed",
                  description: "We've helped build over 400 amazing projects.",
                },
                {
                  title: "600%",
                  subtitle: "Return on investment",
                  description: "Our customers have reported an average of ~600% ROI.",
                },
                {
                  title: "10k",
                  subtitle: "Global downloads",
                  description: "Our free UI kit has been downloaded over 10k times.",
                },
                {
                  title: "200+",
                  subtitle: "5-star reviews",
                  description: "We're proud of our 5-star rating with over 200 reviews.",
                },
              ].map((item) => (
                <div key={item.title} className="flex flex-1 flex-col-reverse gap-3 text-center">
                  <div className="flex flex-col gap-1">
                    <dt className="text-lg font-semibold text-primary">{item.subtitle}</dt>
                    <p className="text-md text-tertiary">{item.description}</p>
                  </div>
                  <dd className="text-display-lg font-semibold text-brand-tertiary_alt md:text-display-xl">
                    {item.title}
                  </dd>
                </div>
              ))}
            </dl>

            <img
              alt="Photographer Girl"
              src="https://www.untitledui.com/marketing/photographer-girl.webp"
              className="h-70 w-full object-cover md:h-140"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
