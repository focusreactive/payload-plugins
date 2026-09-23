export const MetricsCardGrayLight = () => {
  return (
    <section className="bg-primary py-16 md:py-24">
      <div className="mx-auto max-w-container px-4 md:px-8">
        <div className="flex flex-col gap-8 rounded-2xl bg-secondary px-6 py-10 md:gap-16 md:rounded-none md:bg-transparent md:p-0">
          <div className="flex w-full flex-col self-center text-center md:max-w-3xl">
            <h2 className="text-display-sm font-semibold text-primary md:text-display-md">
              Great products, faster than ever
            </h2>
            <p className="mt-4 text-lg text-tertiary md:mt-5 md:text-xl">
              Everything you need to build modern UI and great products.
            </p>
          </div>

          <dl className="flex flex-col gap-8 rounded-2xl bg-secondary md:flex-row md:p-16">
            {[
              {
                title: "400+",
                subtitle: "Projects completed",
              },
              {
                title: "600%",
                subtitle: "Return on investment",
              },
              {
                title: "10k",
                subtitle: "Global downloads",
              },
            ].map((item, index) => (
              <div key={index} className="flex flex-1 flex-col-reverse gap-3 text-center">
                <dt className="text-lg font-semibold text-primary">{item.subtitle}</dt>
                <dd className="text-display-lg font-semibold text-brand-tertiary_alt md:text-display-xl">
                  {item.title}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
};
