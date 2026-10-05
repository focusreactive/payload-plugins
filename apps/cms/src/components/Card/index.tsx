import { Media, ImageAspectRatio } from "@/components/media";
import NextImage from "next/image";
import React from "react";

import { BLOG_CONFIG } from "@/lib/config/blog";
import { cn } from "@/components/utils";
import type { CardPostData } from "@/lib/types";
import { Link } from "@/components/shared";
import { prepareMediaProps } from "@/lib/adapters/prepareMediaProps";

export const Card: React.FC<{
  alignItems?: "center";
  className?: string;
  doc?: CardPostData;
  basePath?: string;
  showTags?: boolean;
  title?: string;
  readMoreLabel?: string;
}> = (props) => {
  const {
    className,
    doc,
    basePath = BLOG_CONFIG.postBasePath,
    showTags,
    title: titleFromProps,
    readMoreLabel,
  } = props;

  const { slug, tags, excerpt, title, heroImage } = doc || {};

  const hasTags = tags && Array.isArray(tags) && tags.length > 0;
  const titleToUse = titleFromProps || title;
  const href = `${basePath}/${slug}`;

  return (
    <Link className="not-prose" href={href}>
      <article
        className={cn(
          "group h-full overflow-hidden rounded-lg border border-border bg-card transition-[border-color,box-shadow] duration-200 ease-out hover:cursor-pointer hover:border-primary hover:shadow-[inset_0_3px_0_var(--color-highlight)]",
          className
        )}
      >
        <div className="relative w-full">
          {!heroImage && (
            <div className="relative w-full aspect-video">
              <NextImage
                src="/empty-placeholder.jpg"
                alt={`${titleToUse} - Placeholder image`}
                fill
                className="object-cover"
                quality={85}
                sizes="33vw"
              />
            </div>
          )}
          {heroImage &&
            typeof heroImage !== "number" &&
            (() => {
              const media = prepareMediaProps({
                aspectRatio: ImageAspectRatio["16/9"],
                image: heroImage,
              });
              return (
                <Media
                  {...media.data}
                  visualEditing={media.visualEditing}
                  imageProps={{
                    ...media.imageProps,
                    fill: true,
                    priority: true,
                    className: "object-cover",
                  }}
                />
              );
            })()}
        </div>
        <div className="flex flex-col gap-3 p-7">
          {showTags && hasTags && (
            <div className="flex flex-wrap gap-2">
              {tags?.map((tag, index) => {
                if (typeof tag === "object") {
                  const tagTitle = tag.title || "Untitled tag";

                  return (
                    <span
                      key={index}
                      className="rounded-pill bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary-soft-foreground"
                    >
                      {tagTitle}
                    </span>
                  );
                }

                return null;
              })}
            </div>
          )}
          {titleToUse && <h3 className="text-h-card text-heading">{titleToUse}</h3>}
          {excerpt && <p className="text-small text-muted-foreground line-clamp-3">{excerpt}</p>}
          {readMoreLabel && (
            <div className="mt-auto pt-1">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                {readMoreLabel}
                <span
                  aria-hidden="true"
                  className="transition-transform group-hover:translate-x-0.5"
                >
                  →
                </span>
              </span>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
};
