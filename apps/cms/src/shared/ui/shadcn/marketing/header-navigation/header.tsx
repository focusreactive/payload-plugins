"use client";

import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { ChevronDown } from "@untitledui/icons";
import {
  Button as AriaButton,
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Popover as AriaPopover,
} from "react-aria-components";
import { Button } from "@/shared/ui/shadcn/base/buttons/button";
import { UntitledLogo } from "@/shared/ui/shadcn/foundations/logo/untitledui-logo";
import { UntitledLogoMinimal } from "@/shared/ui/shadcn/foundations/logo/untitledui-logo-minimal";
import { cx } from "@/shared/lib/utils/cx";
import { DropdownMenuFeatureCard } from "./dropdown-menu-feature-card";
import { DropdownMenuSimpleWithFooter } from "./dropdown-menu-simple-with-footer";
import { DropdownMenuWithTwoColsAndLinksAndFooter } from "./dropdown-menu-with-two-cols-and-links-and-footer";

type HeaderNavItem = {
  label: string;
  href?: string;
  menu?: ReactNode;
};

const headerNavItems: HeaderNavItem[] = [
  { label: "Products", href: "/products", menu: <DropdownMenuSimpleWithFooter /> },
  { label: "Services", href: "/Services", menu: <DropdownMenuFeatureCard /> },
  { label: "Pricing", href: "/pricing" },
  { label: "Resources", href: "/resources", menu: <DropdownMenuWithTwoColsAndLinksAndFooter /> },
  { label: "About", href: "/about" },
];

const footerNavItems = [
  { label: "About us", href: "/" },
  { label: "Press", href: "/products" },
  { label: "Careers", href: "/resources" },
  { label: "Legal", href: "/pricing" },
  { label: "Support", href: "/pricing" },
  { label: "Contact", href: "/pricing" },
  { label: "Sitemap", href: "/pricing" },
  { label: "Cookie settings", href: "/pricing" },
];

const MobileNavItem = (props: {
  className?: string;
  label: string;
  href?: string;
  children?: ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (props.href) {
    return (
      <li>
        <a
          href={props.href}
          className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-primary hover:bg-primary_hover"
        >
          {props.label}
        </a>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-0.5">
      <button
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-primary hover:bg-primary_hover"
      >
        {props.label}{" "}
        <ChevronDown
          className={cx(
            "size-4 stroke-[2.625px] text-fg-quaternary transition duration-100 ease-linear",
            isOpen ? "-rotate-180" : "rotate-0"
          )}
        />
      </button>

      {isOpen && <div>{props.children}</div>}
    </li>
  );
};

const MobileFooter = () => {
  return (
    <div className="flex flex-col gap-8 border-t border-secondary px-4 py-6">
      <div>
        <ul className="grid grid-flow-col grid-cols-2 grid-rows-4 gap-x-6 gap-y-3">
          {footerNavItems.map((navItem) => (
            <li key={navItem.label}>
              <Button color="link-gray" size="sm" href={navItem.href}>
                {navItem.label}
              </Button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-3">
        <Button size="md">Sign up</Button>
        <Button color="secondary" size="md">
          Log in
        </Button>
      </div>
    </div>
  );
};

interface HeaderProps {
  items?: HeaderNavItem[];
  isFullWidth?: boolean;
  isFloating?: boolean;
  className?: string;
}

export const Header = ({
  items = headerNavItems,
  isFullWidth,
  isFloating,
  className,
}: HeaderProps) => {
  const headerRef = useRef<HTMLElement>(null);

  return (
    <header
      ref={headerRef}
      className={cx(
        "relative flex h-16 w-full items-center justify-center md:h-18",
        isFloating && "h-16 md:h-19 md:pt-3",
        isFullWidth && !isFloating
          ? "has-aria-expanded:bg-primary"
          : "max-md:has-aria-expanded:bg-primary",
        className
      )}
    >
      <div className="flex size-full max-w-container flex-1 items-center pr-3 pl-4 md:px-8">
        <div
          className={cx(
            "flex w-full justify-between gap-4",
            isFloating &&
              "ring-secondary_alt md:rounded-2xl md:bg-primary md:py-3 md:pr-3 md:pl-4 md:shadow-xs md:ring-1"
          )}
        >
          <div className="flex flex-1 items-center gap-5">
            <UntitledLogo className="h-7 md:max-lg:hidden" />
            <UntitledLogoMinimal className="hidden h-7 md:inline-block lg:hidden" />

            {/* Desktop navigation */}
            <nav className="max-md:hidden">
              <ul className="flex items-center gap-0.5">
                {items.map((navItem) => (
                  <li key={navItem.label}>
                    {navItem.menu ? (
                      <AriaDialogTrigger>
                        <AriaButton className="flex cursor-pointer items-center gap-0.5 rounded-lg px-1.5 py-1 text-sm font-semibold text-secondary outline-focus-ring transition duration-100 ease-linear hover:text-secondary_hover focus-visible:outline-2 focus-visible:outline-offset-2">
                          <span className="px-0.5">{navItem.label}</span>

                          <ChevronDown className="size-4 rotate-0 stroke-[2.625px] text-fg-quaternary transition duration-100 ease-linear in-aria-expanded:-rotate-180" />
                        </AriaButton>

                        <AriaPopover
                          className={({ isEntering, isExiting }) =>
                            cx(
                              "hidden origin-top will-change-transform md:block",
                              isFullWidth && "w-full",
                              isEntering &&
                                "duration-200 ease-out animate-in fade-in slide-in-from-top-1",
                              isExiting &&
                                "duration-150 ease-in animate-out fade-out slide-out-to-top-1"
                            )
                          }
                          offset={isFloating && !isFullWidth ? -4 : isFullWidth ? 0 : 8}
                          containerPadding={0}
                          triggerRef={
                            (isFloating && isFullWidth) || isFullWidth ? headerRef : undefined
                          }
                        >
                          {({ isEntering, isExiting }) => (
                            <AriaDialog
                              className={cx(
                                "mx-auto origin-top outline-hidden",
                                isFloating && "max-w-7xl px-8 pt-3",
                                // Have to use the scale animation inside the popover to avoid
                                // miscalculating the popover's position when opening.
                                isEntering &&
                                  !isFullWidth &&
                                  "duration-200 ease-out animate-in zoom-in-95",
                                isExiting &&
                                  !isFullWidth &&
                                  "duration-150 ease-in animate-out zoom-out-95"
                              )}
                            >
                              {navItem.menu}
                            </AriaDialog>
                          )}
                        </AriaPopover>
                      </AriaDialogTrigger>
                    ) : (
                      <a
                        href={navItem.href}
                        className="flex cursor-pointer items-center gap-0.5 rounded-lg px-1.5 py-1 text-sm font-semibold text-secondary outline-focus-ring transition duration-100 ease-linear hover:text-secondary_hover focus:outline-offset-2 focus-visible:outline-2"
                      >
                        <span className="px-0.5">{navItem.label}</span>
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Button color="secondary" size={isFloating ? "md" : "sm"}>
              Log in
            </Button>
            <Button color="primary" size={isFloating ? "md" : "sm"}>
              Sign up
            </Button>
          </div>

          {/* Mobile menu and menu trigger */}
          <AriaDialogTrigger>
            <AriaButton
              aria-label="Toggle navigation menu"
              className={({ isFocusVisible, isHovered }) =>
                cx(
                  "group ml-auto cursor-pointer rounded-lg p-2 md:hidden",
                  isHovered && "bg-primary_hover",
                  isFocusVisible && "outline-2 outline-offset-2 outline-focus-ring"
                )
              }
            >
              <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  className="hidden text-secondary group-aria-expanded:block"
                  d="M18 6L6 18M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  className="text-secondary group-aria-expanded:hidden"
                  d="M3 12H21M3 6H21M3 18H21"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </AriaButton>
            <AriaPopover
              triggerRef={headerRef}
              className="scrollbar-hide h-[calc(100%-72px)] w-full overflow-y-auto shadow-lg md:hidden"
              offset={0}
              crossOffset={20}
              containerPadding={0}
              placement="bottom left"
            >
              <AriaDialog className="outline-hidden">
                <nav className="w-full bg-primary shadow-lg">
                  <ul className="flex flex-col gap-0.5 py-5">
                    {items.map((navItem) =>
                      navItem.menu ? (
                        <MobileNavItem key={navItem.label} label={navItem.label}>
                          {navItem.menu}
                        </MobileNavItem>
                      ) : (
                        <MobileNavItem
                          key={navItem.label}
                          label={navItem.label}
                          href={navItem.href}
                        />
                      )
                    )}
                  </ul>

                  <MobileFooter />
                </nav>
              </AriaDialog>
            </AriaPopover>
          </AriaDialogTrigger>
        </div>
      </div>
    </header>
  );
};
