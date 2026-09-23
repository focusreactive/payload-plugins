"use client";

import type { ComponentProps } from "react";
import { ArrowUpRight } from "@untitledui/icons";
import { Avatar } from "@/shared/ui/shadcn/base/avatar/avatar";
import { BadgeGroup } from "@/shared/ui/shadcn/base/badges/badge-groups";
import { Badge } from '@/shared/ui/shadcn/base/badges/badges';
import type { BadgeColor } from '@/shared/ui/shadcn/base/badges/badges';
import { Button } from "@/shared/ui/shadcn/base/buttons/button";
import { cx } from "@/shared/lib/utils/cx";

export type Article = {
  id: string;
  href: string;
  thumbnailUrl: string;
  title: string;
  summary: string;
  category: {
    href: string;
    name: string;
  };
  author: {
    href: string;
    name: string;
    avatarUrl: string;
  };
  publishedAt: string;
  readingTime: string;
  tags: Array<{ name: string; color: BadgeColor<"color">; href: string }>;
  isFeatured?: boolean;
};

export const Simple01Vertical = ({
  article,
  imageClassName,
}: {
  article: Article;
  imageClassName?: string;
}) => (
  <article className="flex flex-col gap-4">
    <a
      href={article.href}
      className="relative overflow-hidden rounded-2xl before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-[inherit] before:ring-[0.5px] before:ring-alpha-black/10 before:ring-inset"
      tabIndex={-1}
    >
      <img
        src={article.thumbnailUrl}
        alt={article.title}
        className={cx(
          "aspect-[1.5] w-full object-cover transition duration-100 ease-linear hover:scale-105",
          imageClassName
        )}
      />
    </a>

    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-brand-secondary">{article.category.name}</span>
        <div className="flex flex-col gap-1">
          <a
            href={article.href}
            className="group/title flex justify-between gap-x-4 rounded-md text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.title}
            <ArrowUpRight
              className="mt-0.5 size-6 shrink-0 text-fg-quaternary transition duration-100 ease-linear group-hover/title:text-fg-quaternary_hover"
              aria-hidden="true"
            />
          </a>

          <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <a href={article.author.href} tabIndex={-1} className="flex">
          <Avatar
            border
            focusable
            alt={article.author.name}
            src={article.author.avatarUrl}
            size="md"
          />
        </a>

        <div>
          <a
            href={article.author.href}
            className="block rounded-xs text-sm font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.author.name}
          </a>
          <time className="block text-sm text-tertiary">{article.publishedAt}</time>
        </div>
      </div>
    </div>
  </article>
);

export const Simple02Vertical = ({
  article,
  badgeTheme = "light",
  imageClassName,
}: {
  article: Article;
  badgeTheme?: ComponentProps<typeof BadgeGroup>["theme"];
  imageClassName?: string;
}) => (
  <article className="flex flex-col gap-4">
    <a
      href={article.href}
      className="relative overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:z-10 before:ring-[0.5px] before:ring-alpha-black/10 before:ring-inset"
      tabIndex={-1}
    >
      <img
        src={article.thumbnailUrl}
        alt={article.title}
        className={cx(
          "aspect-[1.5] w-full object-cover transition duration-100 ease-linear hover:scale-105",
          imageClassName
        )}
      />
    </a>

    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-start gap-3">
        <BadgeGroup
          addonText={article.category.name}
          size="md"
          theme={badgeTheme}
          color="brand"
          className="pr-3"
          iconTrailing={null}
        >
          {article.readingTime}
        </BadgeGroup>
        <div className="flex flex-col gap-1">
          <a
            href={article.category.href}
            className="flex justify-between gap-x-4 rounded-md text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.title}
            <ArrowUpRight
              className="mt-0.5 size-6 shrink-0 text-fg-quaternary"
              aria-hidden="true"
            />
          </a>
          <p className="line-clamp-2 text-md text-tertiary md:line-clamp-none">{article.summary}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <a href={article.author.href} tabIndex={-1} className="flex">
          <Avatar
            border
            focusable
            alt={article.author.name}
            src={article.author.avatarUrl}
            size="md"
          />
        </a>

        <div>
          <a
            href={article.author.href}
            className="block rounded-xs text-sm font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.author.name}
          </a>
          <time className="block text-sm text-tertiary">{article.publishedAt}</time>
        </div>
      </div>
    </div>
  </article>
);

export const Simple03Vertical = ({
  article,
  imageClassName,
  titleClassName,
  className,
}: {
  article: Article;
  imageClassName?: string;
  titleClassName?: string;
  className?: string;
}) => (
  <article className={cx("flex flex-col gap-4", className)}>
    <a
      href={article.href}
      className="relative overflow-hidden rounded-2xl before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-[inherit] before:ring-[0.5px] before:ring-alpha-black/10 before:ring-inset"
      tabIndex={-1}
    >
      <img
        src={article.thumbnailUrl}
        alt={article.title}
        className={cx(
          "aspect-[1.5] w-full object-cover transition duration-100 ease-linear hover:scale-105",
          imageClassName
        )}
      />
    </a>

    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start gap-2">
        <p className="text-sm font-semibold text-brand-secondary">
          {article.author.name} • <time>{article.publishedAt}</time>
        </p>
        <div className="flex w-full flex-col gap-1">
          <a
            href={article.category.href}
            className={cx(
              "flex justify-between gap-x-4 rounded-md text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2",
              titleClassName
            )}
          >
            {article.title}
            <ArrowUpRight
              className="mt-0.5 size-5 shrink-0 text-fg-quaternary"
              aria-hidden="true"
            />
          </a>
          <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {article.tags.map((tag) => (
          <a
            key={tag.name}
            href={tag.href}
            className="rounded-xl outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Badge color={tag.color} size="md">
              {tag.name}
            </Badge>
          </a>
        ))}
      </div>
    </div>
  </article>
);

export const Simple04Vertical = ({
  article,
  imageClassName,
  className,
}: {
  article: Article;
  imageClassName?: string;
  className?: string;
}) => (
  <article className={cx("flex flex-col gap-4", className)}>
    <div className="relative overflow-hidden">
      <a
        href={article.href}
        className="relative w-full overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:z-10 before:ring-[0.5px] before:ring-alpha-black/10 before:ring-inset"
        tabIndex={-1}
      >
        <img
          src={article.thumbnailUrl}
          alt={article.title}
          className={cx(
            "aspect-[1.5] w-full object-cover transition duration-100 ease-linear hover:scale-105",
            imageClassName
          )}
        />
      </a>
      <div className="absolute inset-x-0 bottom-0 overflow-hidden bg-linear-to-b from-transparent to-black/40">
        <div className="relative flex items-start justify-between bg-alpha-white/30 p-4 backdrop-blur-md before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-alpha-white/30 md:p-5">
          <div>
            <a
              href={article.author.href}
              className="block rounded-xs text-sm font-semibold text-white outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {article.author.name}
            </a>
            <time className="block text-sm text-white">{article.publishedAt}</time>
          </div>
          <a
            href={article.category.href}
            className="rounded-xs text-sm font-semibold text-white outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.category.name}
          </a>
        </div>
      </div>
    </div>

    <div className="flex flex-col items-start gap-5">
      <div className="flex flex-col gap-1">
        <a
          href={article.category.href}
          className="flex justify-between gap-x-4 rounded-md text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {article.title}
        </a>
        <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
      </div>

      <Button href={article.href} color="link-color" size="lg" iconTrailing={ArrowUpRight}>
        Read post
      </Button>
    </div>
  </article>
);

export const Simple01Horizontal = ({
  article,
  imageClassName,
}: {
  article: Article;
  imageClassName?: string;
}) => (
  <article className="flex flex-col gap-4 xl:flex-row xl:items-start">
    <a
      href={article.href}
      className="relative shrink-0 overflow-hidden rounded-2xl before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-[inherit] before:ring-[0.5px] before:ring-alpha-black/10 before:ring-inset"
      tabIndex={-1}
    >
      <img
        src={article.thumbnailUrl}
        alt={article.title}
        className={cx(
          "aspect-[1.5] w-full object-cover transition duration-100 ease-linear hover:scale-105 xl:w-80",
          imageClassName
        )}
      />
    </a>

    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-brand-secondary">{article.category.name}</span>

        <div className="flex flex-col gap-1">
          <a
            href={article.category.href}
            className="flex justify-between gap-x-4 rounded-md text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.title}
          </a>

          <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <a href={article.author.href} tabIndex={-1} className="flex">
          <Avatar
            border
            focusable
            alt={article.author.name}
            src={article.author.avatarUrl}
            size="md"
          />
        </a>

        <div>
          <a
            href={article.author.href}
            className="block rounded-xs text-sm font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.author.name}
          </a>
          <time className="block text-sm text-tertiary">{article.publishedAt}</time>
        </div>
      </div>
    </div>
  </article>
);

export const Simple02Horizontal = ({ article }: { article: Article }) => (
  <article className="flex flex-col gap-4 lg:flex-row lg:items-start">
    <a
      href={article.href}
      className="relative shrink-0 overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:z-10 before:ring-[0.5px] before:ring-alpha-black/10 before:ring-inset"
      tabIndex={-1}
    >
      <img
        src={article.thumbnailUrl}
        alt={article.title}
        className="aspect-[1.5] w-full object-cover transition duration-100 ease-linear hover:scale-105 lg:w-80"
      />
    </a>

    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <BadgeGroup
          addonText={article.category.name}
          size="md"
          theme="light"
          color="brand"
          className="pr-3"
          iconTrailing={null}
        >
          {article.readingTime}
        </BadgeGroup>
        <div className="flex flex-col gap-2">
          <a
            href={article.href}
            className="rounded-xs text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.title}
          </a>

          <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <a href={article.author.href} tabIndex={-1} className="flex">
          <Avatar
            border
            focusable
            alt={article.author.name}
            src={article.author.avatarUrl}
            size="md"
          />
        </a>

        <div>
          <a
            href={article.author.href}
            className="block rounded-xs text-sm font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.author.name}
          </a>
          <time className="block text-sm text-tertiary">{article.publishedAt}</time>
        </div>
      </div>
    </div>
  </article>
);

export const Simple03Horizontal = ({
  article,
  imageClassName,
}: {
  article: Article;
  imageClassName?: string;
}) => (
  <article className="flex flex-col gap-4 xl:flex-row xl:items-start">
    <a
      href={article.href}
      className="relative shrink-0 overflow-hidden rounded-2xl before:pointer-events-none before:absolute before:inset-0 before:z-10 before:rounded-[inherit] before:ring-[0.5px] before:ring-alpha-black/10 before:ring-inset"
      tabIndex={-1}
    >
      <img
        src={article.thumbnailUrl}
        alt={article.title}
        className={cx(
          "aspect-[1.5] w-full object-cover transition duration-100 ease-linear hover:scale-105 xl:w-80",
          imageClassName
        )}
      />
    </a>

    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-brand-secondary">
          <a
            href={article.author.href}
            className="rounded-xs outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.author.name}
          </a>{" "}
          • <time>{article.publishedAt}</time>
        </p>
        <div className="flex flex-col gap-1">
          <a
            href={article.href}
            className="rounded-xs text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.title}
          </a>

          <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {article.tags.map((tag) => (
          <a
            key={tag.name}
            href={tag.href}
            className="rounded-xl outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Badge color={tag.color} size="md">
              {tag.name}
            </Badge>
          </a>
        ))}
      </div>
    </div>
  </article>
);

export const Simple04Horizontal = ({ article }: { article: Article }) => (
  <article className="flex flex-col gap-5 lg:flex-row lg:items-start">
    <div className="relative shrink-0 overflow-hidden">
      <a
        href={article.href}
        className="relative w-full overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:z-10 before:ring-[0.5px] before:ring-alpha-black/10 before:ring-inset"
        tabIndex={-1}
      >
        <img
          src={article.thumbnailUrl}
          alt={article.title}
          className="h-60 w-full object-cover transition duration-100 ease-linear hover:scale-105 lg:h-50 lg:w-80"
        />
      </a>
      <div className="absolute inset-x-0 bottom-0 overflow-hidden bg-linear-to-b from-transparent to-black/40">
        <div className="relative flex items-start justify-between bg-alpha-white/30 p-4 backdrop-blur-md before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-alpha-white/30">
          <div>
            <a
              href={article.author.href}
              className="block rounded-xs text-sm font-semibold text-white outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {article.author.name}
            </a>
            <time className="block text-sm text-white">{article.publishedAt}</time>
          </div>
          <a
            href={article.category.href}
            className="rounded-xs text-sm font-semibold text-white outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.category.name}
          </a>
        </div>
      </div>
    </div>

    <div className="flex flex-col items-start gap-5">
      <div className="flex flex-col gap-2">
        <a
          href={article.category.href}
          className="block rounded-xs text-xl font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 md:text-lg"
        >
          {article.title}
        </a>
        <p className="line-clamp-2 text-md text-tertiary lg:line-clamp-3">{article.summary}</p>
      </div>

      <Button href={article.href} color="link-color" size="lg" iconTrailing={ArrowUpRight}>
        Read post
      </Button>
    </div>
  </article>
);

export const CardFullWidthImage01Vertical = ({ article }: { article: Article }) => (
  <article className="flex flex-col overflow-hidden rounded-2xl outline-1 -outline-offset-1 outline-secondary_alt">
    <a href={article.href} tabIndex={-1}>
      <img
        src={article.thumbnailUrl}
        alt={article.title}
        className="aspect-[1.5] w-full rounded-t-2xl object-cover outline-[0.5px] -outline-offset-[0.5px] outline-alpha-black/10 md:h-64"
      />
    </a>

    <div className="flex flex-col gap-5 px-5 pt-5 pb-6 md:p-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-brand-secondary">{article.category.name}</span>
        <div className="flex flex-col gap-1">
          <a
            href={article.href}
            className="flex justify-between gap-4 rounded-md text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.title}
            <ArrowUpRight className="mt-1 size-5 shrink-0 text-fg-quaternary" aria-hidden="true" />
          </a>
          <p className="line-clamp-2 text-md text-tertiary md:line-clamp-3">{article.summary}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <a href={article.author.href} tabIndex={-1} className="flex">
          <Avatar
            border
            focusable
            alt={article.author.name}
            src={article.author.avatarUrl}
            size="md"
          />
        </a>

        <div>
          <a
            href={article.author.href}
            className="block rounded-xs text-sm font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.author.name}
          </a>
          <time className="block text-sm text-tertiary">{article.publishedAt}</time>
        </div>
      </div>
    </div>
  </article>
);

export const CardFullWidthImage02Vertical = ({ article }: { article: Article }) => (
  <article className="flex flex-col overflow-hidden rounded-2xl outline-1 -outline-offset-1 outline-secondary_alt">
    <a href={article.href} tabIndex={-1}>
      <img
        src={article.thumbnailUrl}
        alt={article.title}
        className="aspect-[1.5] w-full rounded-t-2xl object-cover outline-[0.5px] -outline-offset-[0.5px] outline-alpha-black/10 md:h-64"
      />
    </a>

    <div className="flex flex-col gap-5 px-5 pt-5 pb-6 md:p-6">
      <div className="flex flex-col gap-3">
        <BadgeGroup
          addonText={article.category.name}
          size="md"
          theme="light"
          color="brand"
          className="pr-3"
          iconTrailing={null}
        >
          {article.readingTime}
        </BadgeGroup>
        <div className="flex flex-col gap-1">
          <a
            href={article.href}
            className="flex justify-between gap-4 rounded-md text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.title}
            <ArrowUpRight className="mt-1 size-5 shrink-0 text-fg-quaternary" aria-hidden="true" />
          </a>
          <p className="line-clamp-2 text-md text-tertiary md:line-clamp-3">{article.summary}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <a href={article.author.href} tabIndex={-1} className="flex">
          <Avatar
            border
            focusable
            alt={article.author.name}
            src={article.author.avatarUrl}
            size="md"
          />
        </a>

        <div>
          <a
            href={article.author.href}
            className="block rounded-xs text-sm font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.author.name}
          </a>
          <time className="block text-sm text-tertiary">{article.publishedAt}</time>
        </div>
      </div>
    </div>
  </article>
);

export const CardFullWidthImage03Vertical = ({ article }: { article: Article }) => (
  <article className="flex flex-col overflow-hidden rounded-2xl outline-1 -outline-offset-1 outline-secondary_alt">
    <a href={article.href} tabIndex={-1}>
      <img
        src={article.thumbnailUrl}
        alt={article.title}
        className="aspect-[1.5] w-full rounded-t-2xl object-cover outline-[0.5px] -outline-offset-[0.5px] outline-alpha-black/10 md:h-64"
      />
    </a>

    <div className="flex flex-col gap-6 px-5 pt-5 pb-6 md:p-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-brand-secondary">
          {article.author.name} • <time>{article.publishedAt}</time>
        </p>
        <div className="flex flex-col gap-1">
          <a
            href={article.href}
            className="flex justify-between gap-4 rounded-md text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.title}
            <ArrowUpRight className="mt-1 size-5 shrink-0 text-fg-quaternary" aria-hidden="true" />
          </a>
          <p className="line-clamp-2 text-md text-tertiary md:line-clamp-3">{article.summary}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {article.tags.map((tag) => (
          <a
            key={tag.name}
            href={tag.href}
            className="rounded-xl outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Badge color={tag.color} size="md">
              {tag.name}
            </Badge>
          </a>
        ))}
      </div>
    </div>
  </article>
);

export const CardFullWidthImage04Vertical = ({ article }: { article: Article }) => (
  <article className="flex flex-col overflow-hidden rounded-2xl outline-1 -outline-offset-1 outline-secondary_alt">
    <div className="relative shrink-0">
      <a href={article.href} className="w-full" tabIndex={-1}>
        <img
          src={article.thumbnailUrl}
          alt={article.title}
          className="aspect-[1.5] w-full rounded-t-2xl object-cover outline-[0.5px] -outline-offset-[0.5px] outline-alpha-black/10 md:h-64"
        />
      </a>
      <div className="absolute inset-x-0 bottom-0 overflow-hidden bg-linear-to-b from-transparent to-black/40">
        <div className="relative flex items-start justify-between bg-alpha-white/30 p-4 backdrop-blur-md before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-alpha-white/30 md:p-6">
          <div>
            <a
              href={article.author.href}
              className="block rounded-xs text-sm font-semibold text-white outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {article.author.name}
            </a>
            <time className="block text-sm text-white">{article.publishedAt}</time>
          </div>
          <a
            href={article.category.href}
            className="rounded-xs text-sm font-semibold text-white outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.category.name}
          </a>
        </div>
      </div>
    </div>

    <div className="flex flex-col gap-6 px-5 pt-5 pb-6 md:p-6">
      <div className="flex flex-col gap-1">
        <a
          href={article.href}
          className="flex justify-between gap-4 rounded-md text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {article.title}
          <ArrowUpRight className="mt-1 size-5 shrink-0 text-fg-quaternary" aria-hidden="true" />
        </a>
        <p className="line-clamp-2 text-md text-tertiary md:line-clamp-3">{article.summary}</p>
      </div>

      <Button href={article.href} color="link-color" size="lg" iconTrailing={ArrowUpRight}>
        Read post
      </Button>
    </div>
  </article>
);

export const CardFullWidthImage01Horizontal = ({ article }: { article: Article }) => (
  <article className="flex flex-col overflow-hidden rounded-2xl outline-1 -outline-offset-1 outline-secondary_alt md:flex-row md:items-start">
    <a href={article.href} className="shrink-0" tabIndex={-1}>
      <img
        src={article.thumbnailUrl}
        alt={article.title}
        className="h-60 w-full rounded-t-2xl object-cover outline-[0.5px] -outline-offset-[0.5px] outline-alpha-black/10 md:h-60 md:w-80 md:rounded-t-none md:rounded-l-2xl"
      />
    </a>

    <div className="flex flex-col gap-5 px-5 pt-5 pb-6 md:p-6">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-brand-secondary">{article.category.name}</span>
        <div className="flex flex-col gap-1">
          <a
            href={article.href}
            className="rounded-xs text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.title}
          </a>
          <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <a href={article.author.href} tabIndex={-1} className="flex">
          <Avatar
            border
            focusable
            alt={article.author.name}
            src={article.author.avatarUrl}
            size="md"
          />
        </a>

        <div>
          <a
            href={article.author.href}
            className="block rounded-xs text-sm font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.author.name}
          </a>
          <time className="block text-sm text-tertiary">{article.publishedAt}</time>
        </div>
      </div>
    </div>
  </article>
);

export const CardFullWidthImage02Horizontal = ({ article }: { article: Article }) => (
  <article className="flex flex-col overflow-hidden rounded-2xl outline-1 -outline-offset-1 outline-secondary_alt md:flex-row md:items-start">
    <a href={article.href} className="shrink-0" tabIndex={-1}>
      <img
        src={article.thumbnailUrl}
        alt={article.title}
        className="h-60 w-full rounded-t-2xl object-cover outline-[0.5px] -outline-offset-[0.5px] outline-alpha-black/10 md:h-60.5 md:w-80 md:rounded-t-none md:rounded-l-2xl"
      />
    </a>

    <div className="flex flex-col gap-6 px-5 pt-5 pb-6 md:p-6">
      <div className="flex flex-col gap-3">
        <BadgeGroup
          addonText={article.category.name}
          size="md"
          theme="light"
          color="brand"
          className="pr-3"
          iconTrailing={null}
        >
          {article.readingTime}
        </BadgeGroup>
        <div className="flex flex-col gap-1">
          <a
            href={article.href}
            className="rounded-xs text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.title}
          </a>
          <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <a href={article.author.href} tabIndex={-1} className="flex">
          <Avatar
            border
            focusable
            alt={article.author.name}
            src={article.author.avatarUrl}
            size="md"
          />
        </a>

        <div>
          <a
            href={article.author.href}
            className="block rounded-xs text-sm font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.author.name}
          </a>
          <time className="block text-sm text-tertiary">{article.publishedAt}</time>
        </div>
      </div>
    </div>
  </article>
);

export const CardFullWidthImage03Horizontal = ({ article }: { article: Article }) => (
  <article className="flex flex-col overflow-hidden rounded-2xl outline-1 -outline-offset-1 outline-secondary_alt md:flex-row md:items-start">
    <a href={article.href} className="shrink-0" tabIndex={-1}>
      <img
        src={article.thumbnailUrl}
        alt={article.title}
        className="h-60 w-full rounded-t-2xl object-cover outline-[0.5px] -outline-offset-[0.5px] outline-alpha-black/10 md:h-60 md:w-80 md:rounded-t-none md:rounded-l-2xl"
      />
    </a>

    <div className="flex flex-col gap-6 px-5 pt-5 pb-6 md:p-6">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-brand-secondary">
          {article.author.name} • <time>{article.publishedAt}</time>
        </p>
        <div className="flex flex-col gap-1">
          <a
            href={article.href}
            className="rounded-xs text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.title}
          </a>
          <p className="line-clamp-2 text-md text-tertiary">{article.summary}</p>
        </div>
      </div>

      <div className="flex gap-2">
        {article.tags.map((tag) => (
          <a
            key={tag.name}
            href={tag.href}
            className="rounded-xl outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <Badge color={tag.color} size="md">
              {tag.name}
            </Badge>
          </a>
        ))}
      </div>
    </div>
  </article>
);

export const CardFullWidthImage04Horizontal = ({ article }: { article: Article }) => (
  <article className="flex flex-col overflow-hidden rounded-2xl outline-1 -outline-offset-1 outline-secondary_alt md:flex-row md:items-start">
    <div className="relative shrink-0">
      <a href={article.href} className="w-full" tabIndex={-1}>
        <img
          src={article.thumbnailUrl}
          alt={article.title}
          className="h-60 w-full rounded-t-2xl object-cover outline-[0.5px] -outline-offset-[0.5px] outline-alpha-black/10 md:h-60 md:w-80 md:rounded-t-none md:rounded-l-2xl"
        />
      </a>
      <div className="absolute inset-x-0 bottom-0 overflow-hidden bg-linear-to-b from-transparent to-black/40">
        <div className="relative flex items-start justify-between bg-alpha-white/30 p-4 backdrop-blur-md before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-alpha-white/30 md:p-6">
          <div>
            <a
              href={article.author.href}
              className="block rounded-xs text-sm font-semibold text-white outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {article.author.name}
            </a>
            <time className="block text-sm text-white">{article.publishedAt}</time>
          </div>
          <a
            href={article.category.href}
            className="rounded-xs text-sm font-semibold text-white outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {article.category.name}
          </a>
        </div>
      </div>
    </div>

    <div className="flex flex-col gap-6 px-5 pt-5 pb-6 md:p-6">
      <div className="flex flex-col gap-1">
        <a
          href={article.href}
          className="rounded-xs text-lg font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {article.title}
        </a>
        <p className="line-clamp-2 text-md text-tertiary md:line-clamp-3">{article.summary}</p>
      </div>

      <Button href={article.href} color="link-color" size="lg" iconTrailing={ArrowUpRight}>
        Read post
      </Button>
    </div>
  </article>
);
