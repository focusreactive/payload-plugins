import NextImage from "next/image";

import { cn } from "@/components/utils";

import type { IHeroSpotlightCard, IHeroSpotlightProps } from "./types";

/**
 * Photographic scrims rather than palette. A multi-stop radial gradient has no token form, and
 * these three exist only to hold white text legible over whatever photograph an editor picks.
 */
const TOP_LEFT_GLOW =
  "radial-gradient(120% 100% at 0% 0%, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.12) 45%, rgba(0,0,0,0) 78%)";
const BOTTOM_LEFT_GLOW =
  "radial-gradient(110% 100% at 0% 100%, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.1) 48%, rgba(0,0,0,0) 80%)";
const BOTTOM_SCRIM =
  "linear-gradient(to top, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.16) 28%, rgba(0,0,0,0) 52%)";

/**
 * The concept staggers its three groups in by 0 / 180 / 300ms. `fill-mode-backwards` is what holds
 * a delayed group at its start frame instead of flashing it in at full opacity first.
 */
const REVEAL = "animate-in fade-in slide-in-from-bottom-4 duration-700 motion-reduce:animate-none";
const REVEAL_DELAYED = `${REVEAL} fill-mode-backwards`;

interface ArrowGlyphProps {
  height: number;
  strokeWidth: number;
  width: number;
}

function ArrowGlyph({ height, strokeWidth, width }: ArrowGlyphProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={height}
      viewBox="0 0 16 10"
      width={width}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 5h13M10 1l4 4-4 4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}

function StarGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="fill-primary"
      height="12"
      viewBox="0 0 12 12"
      width="12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 .8l1.6 3.3 3.6.5-2.6 2.5.6 3.6L6 9l-3.2 1.7.6-3.6L.8 4.6l3.6-.5z" />
    </svg>
  );
}

function FeaturedCard({
  label,
  image,
  title,
  rating,
  dateIso,
  dateLabel,
  price,
  compareAtPrice,
  href,
  opensInNewTab,
}: IHeroSpotlightCard) {
  const hasMeta = Boolean(rating) || Boolean(dateLabel);
  const hasPrices = Boolean(price) || Boolean(compareAtPrice);

  return (
    <a
      aria-label={title}
      className={cn(
        REVEAL_DELAYED,
        "delay-300",
        "group block w-[clamp(200px,min(19vw,26vh),300px)] min-w-min flex-[0_1_auto]",
        "rounded-xl bg-white p-[clamp(10px,1vw,14px)] text-black",
        "shadow-lift transition-shadow duration-300 hover:shadow-float",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
        "max-sm:w-full max-sm:max-w-[320px]"
      )}
      href={href}
      rel={opensInNewTab ? "noopener noreferrer" : undefined}
      target={opensInNewTab ? "_blank" : undefined}
    >
      <div className="flex items-center justify-between gap-2 px-[4px] pt-[2px] pb-[clamp(8px,0.9vw,12px)]">
        {label && (
          <span className="text-eyebrow whitespace-nowrap text-muted-foreground">{label}</span>
        )}
        <span className="ml-auto flex size-[22px] shrink-0 items-center justify-center rounded-pill bg-primary-soft text-primary opacity-0 transition-opacity duration-[250ms] group-hover:opacity-100 group-focus-visible:opacity-100">
          <ArrowGlyph height={9} strokeWidth={1.8} width={11} />
        </span>
      </div>

      <div className="relative aspect-[300/148] overflow-hidden rounded-lg">
        <NextImage
          alt={image.alt}
          className="object-cover transition-transform duration-[600ms] ease-[cubic-bezier(.2,.7,.3,1)] group-hover:scale-[1.06] motion-reduce:transform-none"
          fill
          sizes="(max-width: 640px) 320px, 300px"
          src={image.src}
        />
      </div>

      <div className="px-[4px] pt-[clamp(10px,1vw,14px)] pb-[4px]">
        {hasMeta && (
          <div className="mb-2 flex items-center gap-2">
            {rating && (
              <span className="text-small inline-flex items-center gap-1 font-medium text-black">
                <StarGlyph />
                {rating}
              </span>
            )}
            {rating && dateLabel && (
              <span aria-hidden className="size-[3px] shrink-0 rounded-pill bg-ink-24" />
            )}
            {dateLabel && (
              <time
                className="text-small whitespace-nowrap font-medium tracking-[0.08em] text-muted-foreground uppercase"
                dateTime={dateIso ?? undefined}
              >
                {dateLabel}
              </time>
            )}
          </div>
        )}

        <div className="text-body-lg mb-[clamp(8px,1vw,12px)] leading-[1.35] text-pretty text-black">
          {title}
        </div>

        {hasPrices && (
          <div className="flex flex-wrap items-baseline gap-2">
            {price && <span className="text-body-lg font-medium text-primary">{price}</span>}
            {compareAtPrice && (
              <span className="text-small text-ink-42 line-through">{compareAtPrice}</span>
            )}
          </div>
        )}
      </div>
    </a>
  );
}

export function HeroSpotlight({
  eyebrow,
  heading,
  introText,
  backgroundImage,
  backgroundObjectPosition,
  photoDarkening,
  ctaLink,
  featuredCard,
}: IHeroSpotlightProps) {
  return (
    <div className="relative flex w-full flex-col overflow-hidden rounded-2xl bg-primary-soft min-h-[clamp(460px,78vh,640px)] md:min-h-[clamp(520px,72vh,820px)]">
      <NextImage
        alt={backgroundImage.alt}
        className="object-cover"
        fill
        priority
        quality={85}
        sizes="(max-width: 1520px) 100vw, 1520px"
        src={backgroundImage.src}
        style={{ objectPosition: backgroundObjectPosition }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 h-[56%] w-[min(62%,900px)]"
        style={{ backgroundImage: TOP_LEFT_GLOW }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 h-[38%] w-[min(56%,760px)]"
        style={{ backgroundImage: BOTTOM_LEFT_GLOW }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: BOTTOM_SCRIM }}
      />
      {photoDarkening > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-black"
          style={{ opacity: photoDarkening / 100 }}
        />
      )}

      <div className="relative flex flex-1 flex-col justify-between gap-[clamp(16px,2.5vh,48px)] px-[clamp(24px,3.4vw,64px)] pt-[clamp(16px,min(3.4vw,5.5vh),64px)] pb-[clamp(14px,min(3vw,5vh),56px)]">
        <div className={cn(REVEAL, "max-w-[min(900px,72%)] max-sm:max-w-none")}>
          {eyebrow && (
            <div className="mb-[clamp(12px,2vh,22px)] flex items-center gap-[10px]">
              <span aria-hidden className="size-[7px] shrink-0 rounded-pill bg-primary" />
              <span className="text-eyebrow text-white">{eyebrow}</span>
            </div>
          )}
          <h1 className="text-display-2 max-w-[15ch] font-normal text-balance text-white">
            {heading}
          </h1>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-[clamp(20px,3vw,48px)] max-sm:flex-col max-sm:items-start">
          <div
            className={cn(REVEAL_DELAYED, "delay-200", "min-w-0 max-w-[480px] flex-[1_1_300px]")}
          >
            {introText && (
              <p className="text-lead mb-[clamp(10px,2.2vh,26px)] max-w-[360px] text-pretty text-white">
                {introText}
              </p>
            )}
            {ctaLink?.label && (
              <a
                className="text-small inline-flex h-[clamp(40px,3.4vw,46px)] items-center gap-[10px] rounded-lg border-[1.5px] border-white px-[clamp(14px,1.9vw,26px)] font-medium whitespace-nowrap text-white transition-colors duration-[250ms] hover:bg-white hover:text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                href={ctaLink.href}
                rel={ctaLink.opensInNewTab ? "noopener noreferrer" : undefined}
                target={ctaLink.opensInNewTab ? "_blank" : undefined}
              >
                {ctaLink.label}
                <ArrowGlyph height={10} strokeWidth={1.5} width={16} />
              </a>
            )}
          </div>

          {featuredCard && <FeaturedCard {...featuredCard} />}
        </div>
      </div>
    </div>
  );
}
