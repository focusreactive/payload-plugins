"use client";

import { Header as HeaderUI } from "@repo/ui";
import type { IHeaderProps } from "@repo/ui/components/sections/header/types";
import { usePathname } from "next/navigation";
import React from "react";

import { computeActiveNavItems } from "./computeActive";

export function HeaderClient(props: IHeaderProps) {
  const pathname = usePathname();
  const navItems = computeActiveNavItems(props.navItems, pathname);

  return <HeaderUI {...props} navItems={navItems} />;
}
