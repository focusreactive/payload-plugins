export function BlogPageSkeleton() {
  return (
    <>
      <section className="pt-[clamp(48px,7vw,88px)]">
        <div className="mx-auto w-full max-w-containerMaxW px-containerBase">
          <div className="mx-auto flex max-w-[720px] flex-col items-center gap-5">
            <div className="h-7 w-32 animate-pulse rounded-pill bg-primary-soft" />
            <div className="h-[clamp(2.8rem,7vw,5.4rem)] w-full max-w-[560px] animate-pulse rounded-md bg-primary-soft" />
          </div>

          <div className="flex flex-col items-center mt-12 py-2">
            <div className="flex sm:justify-center gap-5 mb-3">
              <div className="flex flex-wrap items-center sm:justify-center gap-2.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[34px] w-24 animate-pulse rounded-pill bg-primary-soft"
                  />
                ))}
              </div>
              <div className="size-10 flex-none animate-pulse rounded-pill bg-primary-soft" />
            </div>
          </div>
        </div>
      </section>

      <section className="pb-sectionBase pt-[clamp(28px,4vw,44px)]">
        <div className="mx-auto w-full max-w-containerMaxW px-containerBase">
          <div className="mb-sectionBase grid grid-cols-1 items-center gap-[clamp(28px,5vw,64px)] min-[861px]:grid-cols-[1.15fr_0.85fr]">
            <div className="aspect-[16/11] w-full animate-pulse rounded-lg bg-primary-soft" />
            <div className="flex flex-col gap-[18px]">
              <div className="h-4 w-40 animate-pulse rounded-md bg-primary-soft" />
              <div className="h-20 w-full animate-pulse rounded-md bg-primary-soft" />
              <div className="h-12 w-full animate-pulse rounded-md bg-primary-soft" />
              <div className="flex items-center gap-[18px]">
                <div className="size-10 animate-pulse rounded-pill bg-primary-soft" />
                <div className="h-9 w-36 animate-pulse rounded-md bg-primary-soft" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-[22px] min-[621px]:grid-cols-2 min-[981px]:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-4">
                <div className="aspect-[3/2] w-full animate-pulse rounded-md bg-primary-soft" />
                <div className="h-3.5 w-28 animate-pulse rounded-md bg-primary-soft" />
                <div className="h-6 w-3/4 animate-pulse rounded-md bg-primary-soft" />
                <div className="h-10 w-full animate-pulse rounded-md bg-primary-soft" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
