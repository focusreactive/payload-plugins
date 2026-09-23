"use client";

import type { FC, ReactNode } from "react";
import { CheckCircle } from "@untitledui/icons";
import { BadgeGroup } from "@/shared/ui/shadcn/base/badges/badge-groups";
import { Badge } from "@/shared/ui/shadcn/base/badges/badges";
import { Button } from "@/shared/ui/shadcn/base/buttons/button";
import { FeaturedIcon } from "@/shared/ui/shadcn/foundations/featured-icon/featured-icon";
import { cx } from "@/shared/lib/utils/cx";

export const CheckItemText = (props: {
  size?: "sm" | "md" | "lg" | "xl";
  text?: string;
  color?: "primary" | "success";
  iconStyle?: "outlined" | "contained" | "filled";
  textClassName?: string;
}) => {
  const { text, color, size, iconStyle = "contained" } = props;

  return (
    <li className="flex gap-3">
      {iconStyle === "contained" && (
        <div
          className={cx(
            "flex shrink-0 items-center justify-center rounded-full",
            color === "success"
              ? "bg-success-secondary text-featured-icon-light-fg-success"
              : "bg-brand-primary text-featured-icon-light-fg-brand",
            size === "lg" ? "size-7 md:h-8 md:w-8" : size === "md" ? "size-7" : "size-6"
          )}
        >
          <svg
            width={size === "lg" ? 16 : size === "md" ? 15 : 13}
            height={size === "lg" ? 14 : size === "md" ? 13 : 11}
            viewBox="0 0 13 11"
            fill="none"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M11.0964 0.390037L3.93638 7.30004L2.03638 5.27004C1.68638 4.94004 1.13638 4.92004 0.736381 5.20004C0.346381 5.49004 0.236381 6.00004 0.476381 6.41004L2.72638 10.07C2.94638 10.41 3.32638 10.62 3.75638 10.62C4.16638 10.62 4.55638 10.41 4.77638 10.07C5.13638 9.60004 12.0064 1.41004 12.0064 1.41004C12.9064 0.490037 11.8164 -0.319963 11.0964 0.380037V0.390037Z"
              fill="currentColor"
            />
          </svg>
        </div>
      )}

      {iconStyle === "filled" && (
        <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-solid text-white">
          <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path
              d="M1.5 4L4.5 7L10.5 1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {iconStyle === "outlined" && (
        <CheckCircle
          className={cx(
            "shrink-0",
            color === "success" ? "text-fg-success-primary" : "text-fg-brand-primary",
            size === "lg" ? "size-7 md:h-8 md:w-8" : size === "md" ? "size-7" : "size-6"
          )}
        />
      )}

      <span
        className={cx(
          "text-tertiary",
          size === "lg"
            ? "pt-0.5 text-lg md:pt-0"
            : size === "md"
              ? "pt-0.5 text-md md:pt-0 md:text-lg"
              : "text-md",
          iconStyle === "filled" && "text-brand-secondary",
          props.textClassName
        )}
      >
        {text}
      </span>
    </li>
  );
};

interface PricingTierCardProps {
  icon: FC<{ className?: string }>;
  iconTheme?: "light" | "gradient" | "dark" | "outline" | "modern";
  iconColor?: "brand" | "gray" | "success" | "warning" | "error";
  title: string;
  subtitle: string;
  description?: string;
  features: string[];
  className?: string;
}

export const PricingTierCardIcon = (props: PricingTierCardProps) => {
  return (
    <div
      className={cx(
        "flex flex-col overflow-hidden rounded-2xl bg-primary shadow-lg ring-1 ring-secondary_alt",
        props.className
      )}
    >
      <div className="flex flex-col items-center px-6 pt-6 text-center md:px-8 md:pt-8">
        <FeaturedIcon
          icon={props.icon}
          color={props.iconColor || "brand"}
          theme={props.iconTheme || "light"}
          size="lg"
        />

        <h2 className="mt-4 text-xl font-semibold text-brand-secondary">{props.title}</h2>
        <p className="mt-2 text-display-md font-semibold text-primary md:text-display-lg">
          {props.subtitle}
        </p>
        <p className="mt-2 text-md text-tertiary">{props.description}</p>
      </div>

      <ul className="flex flex-col gap-4 px-6 pt-8 pb-6 md:p-8 md:pb-10">
        {props.features.map((feat) => (
          <CheckItemText key={feat} text={feat} />
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-3 rounded-b-2xl border-t border-secondary bg-secondary px-6 pt-6 pb-8 md:p-8">
        <Button size="xl">Get started</Button>
      </div>
    </div>
  );
};

export const PricingTierCardCallout = (props: {
  title: string;
  subtitle: string;
  description?: string;
  features: string[];
  secondAction?: string;
  checkItemTextColor?: "primary" | "success";
  hasCallout?: boolean;
  className?: string;
}) => {
  return (
    <div
      className={cx(
        "relative flex flex-col rounded-2xl bg-primary shadow-lg ring-1 ring-secondary_alt",
        props.className
      )}
    >
      {props.hasCallout && (
        <div className="absolute -top-6 right-2 md:-right-16">
          <div className="flex text-brand-secondary">
            <svg width="60" height="46" viewBox="0 0 60 46" fill="none">
              <path
                d="M9.22056 42.4485C9.06321 43.2619 9.595 44.0488 10.4084 44.2061C11.2217 44.3635 12.0086 43.8317 12.166 43.0184L9.22056 42.4485ZM50.5841 3.7912C51.405 3.68023 51.9806 2.92474 51.8696 2.10378C51.7586 1.28282 51.0032 0.707267 50.1822 0.818242L50.5841 3.7912ZM4.78725 32.3308C4.36038 31.6208 3.43878 31.3913 2.7288 31.8182C2.01882 32.2451 1.78931 33.1667 2.21618 33.8766L4.78725 32.3308ZM8.9767 42.2098L7.69117 42.9828L7.69189 42.984L8.9767 42.2098ZM12.5932 43.2606L11.9803 41.8916L11.979 41.8921L12.5932 43.2606ZM23.5123 40.0155C24.2684 39.677 24.6069 38.7897 24.2684 38.0336C23.9299 37.2774 23.0425 36.9389 22.2864 37.2774L23.5123 40.0155ZM10.6933 42.7334C12.166 43.0184 12.1659 43.0187 12.1658 43.019C12.1658 43.0189 12.1658 43.0192 12.1658 43.0192C12.1658 43.0192 12.1658 43.0189 12.166 43.0184C12.1662 43.0173 12.1666 43.0152 12.1672 43.012C12.1684 43.0058 12.1705 42.9953 12.1735 42.9808C12.1794 42.9517 12.1887 42.9064 12.2016 42.8456C12.2274 42.7239 12.2676 42.5403 12.3233 42.3008C12.4349 41.8216 12.6088 41.1193 12.8551 40.2421C13.3481 38.4863 14.1291 36.0371 15.2773 33.2782C17.5833 27.7375 21.3236 21.0615 27.0838 16.2002L25.1489 13.9076C18.8763 19.2013 14.905 26.3651 12.5076 32.1255C11.3042 35.0171 10.4856 37.5837 9.96684 39.4311C9.7073 40.3554 9.52235 41.1015 9.40152 41.6204C9.34109 41.8799 9.29667 42.0827 9.26695 42.2227C9.25209 42.2927 9.24091 42.3471 9.23323 42.385C9.22939 42.4039 9.22643 42.4187 9.22432 42.4294C9.22327 42.4347 9.22243 42.4389 9.22181 42.4421C9.22149 42.4437 9.22123 42.4451 9.22103 42.4461C9.22092 42.4467 9.22081 42.4473 9.22075 42.4475C9.22065 42.4481 9.22056 42.4485 10.6933 42.7334ZM27.0838 16.2002C38.8964 6.23107 48.2848 4.10201 50.5841 3.7912L50.1822 0.818242C47.3237 1.20465 37.402 3.56662 25.1489 13.9076L27.0838 16.2002ZM2.21618 33.8766L7.69117 42.9828L10.2622 41.4369L4.78725 32.3308L2.21618 33.8766ZM7.69189 42.984C8.83415 44.8798 11.2204 45.5209 13.2074 44.6291L11.979 41.8921C11.2779 42.2068 10.5661 41.9412 10.2615 41.4357L7.69189 42.984ZM13.2061 44.6297L23.5123 40.0155L22.2864 37.2774L11.9803 41.8916L13.2061 44.6297Z"
                fill="currentColor"
              />
            </svg>
            <span className="-mt-2 text-sm font-semibold">Most popular!</span>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center px-6 pt-10 text-center md:px-8">
        <h2 className="text-display-md font-semibold text-primary md:text-display-lg">
          {props.subtitle}
        </h2>
        <p className="mt-4 text-xl font-semibold text-primary md:text-xl">{props.title}</p>
        <p className="mt-1 text-md text-tertiary">{props.description}</p>
      </div>

      <ul className="flex flex-col gap-4 px-6 pt-8 pb-8 md:p-8 md:pb-10">
        {props.features.map((feat) => (
          <CheckItemText key={feat} text={feat} color={props.checkItemTextColor} />
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-3 px-6 pb-8 md:px-8">
        <Button size="xl">Get started</Button>
        {props.secondAction && (
          <Button color="secondary" size="xl">
            {props.secondAction}
          </Button>
        )}
      </div>
    </div>
  );
};

export const PricingTierCardIconOffset = (props: PricingTierCardProps) => {
  return (
    <div className={cx("relative flex flex-col rounded-2xl bg-secondary", props.className)}>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <FeaturedIcon icon={props.icon} color="gray" theme="modern" size="lg" />
      </div>

      <div className="flex flex-col items-center px-6 pt-12 text-center md:px-8">
        <h2 className="text-xl font-semibold text-primary">{props.title}</h2>
        <p className="mt-2 text-display-md font-semibold text-primary md:text-display-lg">
          {props.subtitle}
        </p>
        <p className="mt-2 text-md text-tertiary">{props.description}</p>
      </div>

      <ul className="flex flex-col gap-4 px-6 py-8 md:px-8 md:pt-8 md:pb-10">
        {props.features.map((feat) => (
          <CheckItemText key={feat} text={feat} iconStyle="outlined" />
        ))}
      </ul>

      <div className="mt-auto flex flex-col gap-3 px-6 pb-8 md:px-8">
        <Button size="xl">Get started</Button>
      </div>
    </div>
  );
};

export const PricingTierCardDualCheckItems = (props: {
  title: string;
  description?: string;
  contentTitle: string;
  contentDescription: ReactNode;
  price?: number;
  badge?: string;
  features: string[];
  className?: string;
}) => {
  return (
    <div
      className={cx(
        "flex flex-col overflow-hidden rounded-2xl bg-primary shadow-lg ring-1 ring-secondary_alt",
        props.className
      )}
    >
      <div className="flex flex-col-reverse gap-4 px-6 pt-6 pb-8 md:flex-row md:justify-between md:gap-8 md:px-8 md:pt-8 md:pb-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-primary">{props.title}</h2>
            {props.badge && (
              <Badge size="md" type="pill-color" color="brand">
                {props.badge}
              </Badge>
            )}
          </div>
          <p className="text-md text-tertiary">{props.description}</p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="-translate-y-[5px] text-display-md font-semibold text-primary md:-translate-y-[15px]">
            $
          </span>
          <span className="text-display-lg font-semibold text-primary md:text-display-xl">
            {props.price || 10}
          </span>
          <span className="text-md font-medium text-tertiary">per month</span>
        </div>
      </div>

      <div className="flex flex-col gap-6 border-t border-secondary px-6 py-8 md:px-8 md:pt-8 md:pb-10">
        <div className="flex flex-col gap-1">
          <p className="text-md font-semibold text-primary">{props.contentTitle}</p>
          <p className="text-md text-tertiary">{props.contentDescription}</p>
        </div>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
          {props.features.map((feat) => (
            <CheckItemText key={feat} color="success" text={feat} />
          ))}
        </ul>
      </div>

      <div className="mt-auto flex flex-col gap-3 border-t border-secondary px-6 pt-6 pb-8 md:p-8">
        <Button size="xl">Get started</Button>
      </div>
    </div>
  );
};

export const PricingTierCardBadge = (props: {
  title: string;
  subtitle: string;
  description?: string;
  features: string[];
  className?: string;
}) => {
  return (
    <div
      className={cx(
        "flex flex-col overflow-hidden rounded-2xl bg-primary shadow-lg ring-1 ring-secondary_alt",
        props.className
      )}
    >
      <div className="flex flex-col items-center px-6 pt-6 pb-8 text-center md:px-8 md:pt-10">
        <Badge size="lg" type="pill-color" color="brand">
          {props.title}
        </Badge>
        <p className="mt-4 text-display-md font-semibold text-primary md:text-display-lg">
          {props.subtitle}
        </p>
        <p className="mt-2 text-md text-tertiary">{props.description}</p>

        <div className="mt-6 flex flex-col gap-3 self-stretch md:mt-4">
          <Button size="xl">Get started</Button>
          <Button color="secondary" size="xl">
            Chat to sales
          </Button>
        </div>
      </div>
      <div className="mx-6 h-px bg-border-secondary md:mx-8"></div>
      <ul className="flex flex-col gap-4 px-6 pt-8 pb-10 md:px-8">
        {props.features.map((feat) => (
          <CheckItemText key={feat} iconStyle="outlined" color="success" text={feat} />
        ))}
      </ul>
    </div>
  );
};

export const PricingTierCardBadgeGroup = (props: {
  title: string;
  subtitle: string;
  description?: string;
  features: string[];
  isMostPopular?: boolean;
  className?: string;
}) => {
  return (
    <div
      className={cx(
        "flex flex-col overflow-hidden rounded-2xl bg-primary shadow-lg ring-1 ring-secondary_alt",
        props.className
      )}
    >
      <div className="flex flex-col items-center p-6 pb-8 text-center md:p-8">
        <BadgeGroup
          size="lg"
          color="brand"
          theme="modern"
          addonText={props.title}
          iconTrailing={false}
        >
          {props.isMostPopular ? "Most popular" : undefined}
        </BadgeGroup>

        <p className="mt-6 text-display-md font-semibold text-primary md:text-display-lg">
          {props.subtitle}
        </p>
        <p className="mt-2 text-md text-tertiary">{props.description}</p>
      </div>

      <div className="mx-6 border-t border-secondary md:mx-8"></div>

      <ul className="flex flex-col gap-4 px-6 py-8 md:px-8">
        {props.features.map((feat) => (
          <CheckItemText key={feat} iconStyle="outlined" color="primary" text={feat} />
        ))}
      </ul>

      <div className="mx-6 border-t border-secondary md:mx-8"></div>

      <div className="mt-auto flex flex-col gap-3 p-6 pb-8 md:p-8">
        <Button size="xl">Get started</Button>
      </div>
    </div>
  );
};

export const PricingTierCardDualAction = (props: {
  title: string;
  description?: string;
  contentTitle: string;
  contentDescription: ReactNode;
  badge?: string;
  price: string;
  features: string[];
  className?: string;
}) => (
  <div
    key={props.title}
    className="flex flex-col overflow-hidden rounded-2xl bg-primary shadow-lg ring-1 ring-secondary_alt"
  >
    <div className="flex flex-col p-6 pb-8 md:p-8">
      <div className="flex justify-between">
        <span className="text-lg font-semibold text-tertiary">{props.title}</span>
        {props.badge && (
          <Badge size="lg" type="pill-color" color="brand">
            {props.badge}
          </Badge>
        )}
      </div>

      <div className="mt-4 flex items-end gap-1">
        <p className="text-display-lg font-semibold text-primary md:text-display-xl">
          {props.price}
        </p>
        <span className="pb-2 text-md font-medium text-tertiary">per month</span>
      </div>

      <p className="mt-4 text-md text-tertiary">{props.description}</p>

      <div className="mt-8 flex flex-col gap-3 self-stretch">
        <Button size="xl">Get started</Button>
        <Button color="secondary" size="xl">
          Chat to sales
        </Button>
      </div>
    </div>

    <div className="flex flex-col gap-6 px-6 pt-8 pb-10 ring-1 ring-secondary md:px-8">
      <div>
        <p className="text-md font-semibold text-primary uppercase">{props.contentTitle}</p>
        <p className="mt-1 text-md text-tertiary">{props.contentDescription}</p>
      </div>
      <ul className="flex flex-col gap-4">
        {props.features.map((feat) => (
          <CheckItemText key={feat} iconStyle="outlined" color="primary" text={feat} />
        ))}
      </ul>
    </div>
  </div>
);

export const PricingTierCardBanner = (props: {
  banner?: string;
  title: string;
  subtitle: string;
  description?: string;
  features: string[];
  className?: string;
  secondAction?: string;
}) => {
  return (
    <div
      className={cx(
        "flex flex-col overflow-hidden rounded-2xl bg-primary shadow-lg ring-1 ring-secondary_alt",
        props.className
      )}
    >
      {props.banner && (
        <div className="w-full bg-brand-solid px-2 py-3 text-center">
          <p className="text-sm font-semibold text-white">{props.banner}</p>
        </div>
      )}

      <div>
        <div className="flex flex-col items-center px-6 pt-8 text-center md:px-8">
          <p className="text-display-md font-semibold text-primary md:text-display-lg">
            {props.subtitle}
          </p>
          <h2 className="mt-4 text-xl font-semibold text-primary">{props.title}</h2>
          <p className="mt-1 text-md text-tertiary">{props.description}</p>
        </div>

        <ul className="flex flex-col gap-4 px-6 py-8 md:px-8 md:pb-10">
          {props.features.map((feat) => (
            <CheckItemText key={feat} iconStyle="outlined" color="success" text={feat} />
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-3 px-6 pb-8 md:px-8">
          <Button size="xl">Get started</Button>
          {props.secondAction && (
            <Button color="secondary" size="xl">
              {props.secondAction}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export const PricingTierCardSimple = (props: PricingTierCardProps) => (
  <div className="flex flex-col bg-brand-primary_alt">
    <div className="flex flex-col items-center px-6 pt-10 text-center md:px-8 md:pt-10">
      <p className="text-display-md font-semibold text-brand-primary md:text-display-lg">
        {props.subtitle}
      </p>
      <h2 className="mt-4 text-xl font-semibold text-brand-primary">{props.title}</h2>
      <p className="mt-1 text-md text-brand-secondary">{props.description}</p>
    </div>

    <ul className="flex flex-col gap-4 px-6 py-8 md:px-8 md:pb-10">
      {props.features.map((feat) => (
        <CheckItemText key={feat} text={feat} iconStyle="filled" />
      ))}
    </ul>

    <div className="flex flex-col gap-3 px-6 pb-8 md:px-8">
      <Button size="xl">Get started</Button>
    </div>
  </div>
);

export const PricingTierCardPrimaryCardIcon = (props: {
  title: string;
  icon: FC<{ className?: string }>;
  subtitle: string;
  description: string;
  features: string[];
}) => (
  <div className="flex flex-col bg-brand-primary_alt">
    <div className="flex flex-col items-center px-6 pt-6 text-center md:px-8 md:pt-8">
      <FeaturedIcon icon={props.icon} color="brand" theme="light" size="lg" />

      <h2 className="mt-4 text-xl font-semibold text-brand-primary">{props.title}</h2>
      <p className="mt-2 text-display-md font-semibold text-brand-primary md:text-display-lg">
        {props.subtitle}
      </p>
      <p className="mt-2 text-md text-brand-secondary">{props.description}</p>
    </div>

    <ul className="flex flex-col gap-4 px-6 py-8 md:px-8">
      {props.features.map((feat) => (
        <CheckItemText key={feat} text={feat} iconStyle="filled" />
      ))}
    </ul>

    <div className="mt-auto flex flex-col gap-3 px-6 pb-8 md:mt-2 md:px-8">
      <Button size="xl">Get started</Button>
    </div>
  </div>
);
