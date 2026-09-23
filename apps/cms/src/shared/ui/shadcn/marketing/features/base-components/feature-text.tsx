"use client";

import type { FC } from "react";
import type { ReactNode } from 'react';
import { FeaturedIcon } from "@/shared/ui/shadcn/foundations/featured-icon/featured-icon";

interface TextCentered {
  title: string;
  subtitle: string;
  footer?: ReactNode;
}

export const FeatureTextCentered = ({ title, subtitle, footer }: TextCentered) => (
  <div className="flex max-w-sm flex-col items-center gap-4 text-center">
    <div>
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      <p className="mt-1 text-md text-tertiary">{subtitle}</p>
    </div>

    {footer}
  </div>
);

export const FeatureTextLeft = ({ title, subtitle, footer }: TextCentered) => (
  <div className="flex max-w-sm flex-col gap-4">
    <div>
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      <p className="mt-1 text-md text-tertiary">{subtitle}</p>
    </div>

    {footer}
  </div>
);

interface FeatureTextIcon extends TextCentered {
  icon: FC<{ className?: string }>;
}

export const FeatureTextIconTopCentered = ({
  icon: Icon,
  title,
  subtitle,
  footer,
}: FeatureTextIcon) => (
  <div className="flex max-w-sm flex-col items-center gap-3 text-center md:gap-4">
    <Icon className="size-6 text-icon-fg-brand" />

    <div>
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      <p className="mt-1 text-md text-tertiary">{subtitle}</p>
    </div>

    {footer}
  </div>
);

export const FeatureTextIconTopLeft = ({
  icon: Icon,
  title,
  subtitle,
  footer,
}: FeatureTextIcon) => (
  <div className="flex max-w-sm flex-col gap-4">
    <Icon className="size-6 text-icon-fg-brand" />

    <div>
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      <p className="mt-1 text-md text-tertiary">{subtitle}</p>
    </div>

    {footer}
  </div>
);

export const FeatureTextIconLeft = ({ icon: Icon, title, subtitle, footer }: FeatureTextIcon) => (
  <div className="flex max-w-140 gap-4">
    <Icon className="size-6 shrink-0 text-icon-fg-brand" />

    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        <p className="mt-1 text-md text-tertiary">{subtitle}</p>
      </div>

      {footer}
    </div>
  </div>
);

export const FeatureTextFeaturedIconTopCentered = ({
  color = "gray",
  theme = "modern",
  icon,
  title,
  subtitle,
  footer,
}: FeatureTextIcon & {
  color?: "brand" | "gray" | "success" | "warning" | "error";
  theme?: "light" | "gradient" | "dark" | "outline" | "modern";
}) => (
  <div className="flex max-w-sm flex-col items-center gap-4 text-center">
    <FeaturedIcon
      icon={icon}
      size="lg"
      color={color}
      theme={theme}
      className="hidden md:inline-flex"
    />
    <FeaturedIcon
      icon={icon}
      size="md"
      color={color}
      theme={theme}
      className="inline-flex md:hidden"
    />

    <div>
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      <p className="mt-1 text-md text-tertiary">{subtitle}</p>
    </div>

    {footer}
  </div>
);

export const FeatureTextFeaturedIconTopLeft = ({
  icon,
  title,
  subtitle,
  footer,
}: FeatureTextIcon) => (
  <div className="flex max-w-sm flex-col gap-4">
    <FeaturedIcon
      icon={icon}
      size="lg"
      color="gray"
      theme="modern"
      className="hidden md:inline-flex"
    />
    <FeaturedIcon
      icon={icon}
      size="md"
      color="gray"
      theme="modern"
      className="inline-flex md:hidden"
    />

    <div>
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      <p className="mt-1 text-md text-tertiary">{subtitle}</p>
    </div>

    {footer}
  </div>
);

export const FeatureTextFeaturedIconLeft = ({ icon, title, subtitle, footer }: FeatureTextIcon) => (
  <div className="flex max-w-140 gap-4">
    <FeaturedIcon
      icon={icon}
      size="lg"
      color="gray"
      theme="modern"
      className="hidden md:inline-flex"
    />
    <FeaturedIcon
      icon={icon}
      size="md"
      color="gray"
      theme="modern"
      className="inline-flex md:hidden"
    />

    <div className="flex flex-col items-start gap-4">
      <div>
        <h3 className="mt-1.5 text-lg font-semibold text-primary md:mt-2.5">{title}</h3>
        <p className="mt-1 text-md text-tertiary">{subtitle}</p>
      </div>

      {footer}
    </div>
  </div>
);

export const FeatureTextFeaturedIconBox = ({ icon, title, subtitle, footer }: FeatureTextIcon) => (
  <div className="mt-6 flex max-w-sm flex-col items-center gap-4 rounded-2xl bg-secondary px-6 pb-8 text-center">
    <FeaturedIcon icon={icon} size="lg" color="gray" theme="modern" className="-mt-6" />

    <div>
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      <p className="mt-1 text-md text-tertiary">{subtitle}</p>
    </div>

    {footer}
  </div>
);

interface FeatureTextIntegrationIcon extends TextCentered {
  imgUrl: string;
}

export const FeatureTextIntegrationIconTopCentered = ({
  imgUrl,
  title,
  subtitle,
  footer,
}: FeatureTextIntegrationIcon) => (
  <div className="flex max-w-sm flex-col items-center gap-4 text-center">
    <span className="flex size-13 shrink-0 items-center justify-center rounded-lg bg-primary shadow-xs ring-1 ring-secondary ring-inset md:size-16 md:rounded-xl">
      <img alt={title} src={imgUrl} className="size-12 md:size-14" />
    </span>

    <div className="flex flex-col items-center gap-4">
      <div>
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        <p className="mt-1 text-md text-tertiary">{subtitle}</p>
      </div>

      {footer}
    </div>
  </div>
);

export const FeatureTextIntegrationIconTopLeft = ({
  imgUrl,
  title,
  subtitle,
  footer,
}: FeatureTextIntegrationIcon) => (
  <div className="flex max-w-sm flex-col gap-4">
    <span className="flex size-13 shrink-0 items-center justify-center rounded-lg bg-primary shadow-xs ring-1 ring-secondary ring-inset md:size-16 md:rounded-xl">
      <img alt={title} src={imgUrl} className="size-12 md:size-14" />
    </span>

    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        <p className="mt-1 text-md text-tertiary">{subtitle}</p>
      </div>

      {footer}
    </div>
  </div>
);

export const FeatureTextIntegrationIconLeft = ({
  imgUrl,
  title,
  subtitle,
  footer,
}: FeatureTextIntegrationIcon) => (
  <div className="flex max-w-140 gap-4">
    <span className="flex size-13 shrink-0 items-center justify-center rounded-lg bg-primary shadow-xs ring-1 ring-secondary ring-inset md:size-16 md:rounded-xl">
      <img alt={title} src={imgUrl} className="size-12 md:size-14" />
    </span>

    <div className="flex flex-col gap-4">
      <div>
        <h3 className="mt-2.5 text-lg font-semibold text-primary md:mt-4">{title}</h3>
        <p className="mt-1 text-md text-tertiary">{subtitle}</p>
      </div>

      {footer}
    </div>
  </div>
);

export const FeatureTextIntegrationIconBox = ({
  imgUrl,
  title,
  subtitle,
  footer,
}: FeatureTextIntegrationIcon) => (
  <div className="mt-6 flex max-w-sm flex-col items-center gap-4 rounded-2xl bg-secondary px-6 pb-8 text-center">
    <span className="-mt-[26px] flex size-13 shrink-0 items-center justify-center rounded-lg bg-primary shadow-xs ring-1 ring-secondary ring-inset md:-mt-8 md:size-16 md:rounded-xl">
      <img alt={title} src={imgUrl} className="size-12 md:size-14" />
    </span>

    <div>
      <h3 className="text-lg font-semibold text-primary">{title}</h3>
      <p className="mt-1 text-md text-tertiary">{subtitle}</p>
    </div>

    {footer}
  </div>
);

export const FeatureTextIconCard = ({ icon: Icon, title, subtitle, footer }: FeatureTextIcon) => (
  <div className="flex flex-col gap-8 bg-secondary p-5 md:max-w-71.5 md:gap-12 md:p-6">
    <Icon className="size-6 text-icon-fg-brand" />

    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        <p className="mt-1 text-md text-tertiary">{subtitle}</p>
      </div>

      {footer}
    </div>
  </div>
);

export const FeatureTextFeaturedIconCard = ({ icon, title, subtitle, footer }: FeatureTextIcon) => (
  <div className="flex flex-col gap-12 bg-secondary p-5 md:inline-flex md:gap-16 md:p-6">
    <FeaturedIcon icon={icon} size="lg" color="brand" theme="dark" />

    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-lg font-semibold text-primary">{title}</h3>
        <p className="mt-1 text-md text-tertiary">{subtitle}</p>
      </div>

      {footer}
    </div>
  </div>
);

export const FeatureTextLeftBrand = ({ title, subtitle, footer }: TextCentered) => (
  <div className="flex max-w-sm flex-col gap-4">
    <div>
      <h3 className="text-lg font-semibold text-primary_on-brand">{title}</h3>
      <p className="mt-1 text-md text-tertiary_on-brand">{subtitle}</p>
    </div>

    {footer}
  </div>
);

export const FeatureTextFeaturedIconTopCenteredBrand = ({
  icon,
  title,
  subtitle,
  footer,
}: FeatureTextIcon) => (
  <div className="flex max-w-sm flex-col items-center gap-4 text-center">
    <FeaturedIcon
      icon={icon}
      size="lg"
      color="brand"
      theme="dark"
      className="hidden md:inline-flex"
    />
    <FeaturedIcon
      icon={icon}
      size="md"
      color="brand"
      theme="dark"
      className="inline-flex md:hidden"
    />

    <div>
      <h3 className="text-lg font-semibold text-primary_on-brand">{title}</h3>
      <p className="mt-1 text-md text-tertiary_on-brand">{subtitle}</p>
    </div>

    {footer}
  </div>
);

export const FeatureTextFeaturedIconTopLeftBrand = ({
  icon,
  title,
  subtitle,
  footer,
}: FeatureTextIcon) => (
  <div className="flex max-w-sm flex-col gap-4">
    <FeaturedIcon
      icon={icon}
      size="lg"
      color="brand"
      theme="dark"
      className="hidden md:inline-flex"
    />
    <FeaturedIcon
      icon={icon}
      size="md"
      color="brand"
      theme="dark"
      className="inline-flex md:hidden"
    />

    <div>
      <h3 className="text-lg font-semibold text-primary_on-brand">{title}</h3>
      <p className="mt-1 text-md text-tertiary_on-brand">{subtitle}</p>
    </div>

    {footer}
  </div>
);
