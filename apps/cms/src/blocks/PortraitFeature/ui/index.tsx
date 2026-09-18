import Link from "next/link";

import { DisplayHeading } from "@/components/DisplayHeading";
import { Media } from "@/components/media";

interface PortraitFeatureProps {
  personName: string;
  heading: string;
  description: string;
  portraitSrc?: string;
  portraitAlt?: string;
  linkHref?: string;
  linkLabel?: string;
  linkOpensInNewTab?: boolean;
}

export function PortraitFeature({
  personName,
  heading,
  description,
  portraitSrc,
  portraitAlt,
  linkHref,
  linkLabel,
  linkOpensInNewTab,
}: PortraitFeatureProps) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-[clamp(24px,3.4vw,64px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* justify-between pins the name and headline to the top of the portrait and the supporting
          text and button to its bottom, which only has an effect once the columns sit side by side. */}
      <div className="flex min-w-0 flex-col justify-between gap-[clamp(32px,5vw,80px)] py-[clamp(4px,0.6vw,10px)]">
        <div>
          <div className="mb-[clamp(10px,1.2vw,18px)] flex items-center gap-2.5">
            <svg
              aria-hidden="true"
              className="size-3.5 shrink-0 fill-primary"
              viewBox="0 0 14 14"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M7 0l1.3 4.4L13 5.7 8.4 7 7 14 5.6 7 1 5.7 5.7 4.4z" />
            </svg>
            <span className="text-foreground text-small">{personName}</span>
          </div>
          <DisplayHeading
            as="h2"
            className="max-w-[20ch] text-foreground"
            size="display-2"
            text={heading}
          />
        </div>

        <div>
          <p className="mb-[clamp(18px,2vw,30px)] max-w-[46ch] text-pretty text-lead text-muted-foreground">
            {description}
          </p>
          {linkHref && linkLabel ? (
            <Link
              className="inline-flex h-[clamp(40px,3.4vw,46px)] items-center whitespace-nowrap rounded-lg bg-primary px-[clamp(14px,1.7vw,24px)] font-medium text-primary-foreground text-small transition-colors duration-[250ms] hover:bg-primary-hover"
              href={linkHref}
              {...(linkOpensInNewTab ? { rel: "noopener noreferrer", target: "_blank" } : {})}
            >
              {linkLabel}
            </Link>
          ) : null}
        </div>
      </div>

      {/* relative is load-bearing: next/image with fill positions against the nearest positioned
          ancestor, and the <picture> the Media component wraps it in is not positioned. */}
      {/* With no photograph uploaded the mint frame stays, so the section keeps its proportions and
          reads as a picture waiting to be filled rather than a broken image. */}
      <div className="relative aspect-[4/5] min-w-0 overflow-hidden rounded-2xl bg-primary-soft lg:-mr-containerBase lg:aspect-auto lg:min-h-[clamp(260px,30vw,520px)]">
        {portraitSrc ? (
          <Media
            alt={portraitAlt ?? ""}
            htmlElement={null}
            imageProps={{
              className: "size-full object-cover object-[center_32%]",
              fill: true,
              quality: 85,
              sizes: "(max-width: 1024px) 100vw, 52vw",
            }}
            kind="image"
            src={portraitSrc}
          />
        ) : null}
      </div>
    </div>
  );
}
