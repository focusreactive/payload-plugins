"use client";

import { isValidElement } from 'react';
import type { FC, ReactNode } from 'react';
import { cx } from "@/shared/lib/utils/cx";
import { isReactComponent } from "@/shared/lib/utils/is-react-component";

interface NavMenuItemLinkProps {
  href: string;
  title: string;
  subtitle?: string;
  icon?: FC<{ className?: string }> | ReactNode;
  className?: string;
  iconClassName?: string;
  textContainerClassName?: string;
  badge?: ReactNode;
  actionsContent?: ReactNode;
}

export const NavMenuItemLink = ({
  href,
  icon: Icon,
  iconClassName,
  title,
  badge,
  subtitle,
  className,
  textContainerClassName,
  actionsContent,
}: NavMenuItemLinkProps) => (
  <a
    href={href}
    className={cx(
      "inline-flex w-full gap-3 px-4 py-3 outline-focus-ring transition duration-100 ease-linear hover:bg-primary_hover focus-visible:outline-2 sm:max-w-80 sm:p-3 md:rounded-lg",
      className
    )}
  >
    {isValidElement(Icon) && Icon}
    {isReactComponent(Icon) && (
      <Icon className={cx("size-5 shrink-0 text-fg-brand-primary", iconClassName)} />
    )}

    <div className="flex flex-col gap-3">
      <div className={cx("flex flex-col gap-1", textContainerClassName)}>
        <div className="flex max-h-5 items-center gap-1.5">
          <span className="text-sm font-semibold text-primary">{title}</span>
          {badge}
        </div>

        {subtitle && <span className="line-clamp-2 text-sm text-tertiary">{subtitle}</span>}
      </div>

      {actionsContent}
    </div>
  </a>
);
