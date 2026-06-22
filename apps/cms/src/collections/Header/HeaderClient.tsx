"use client";

import { Header as HeaderUI } from "./ui";
import type { IHeaderProps } from "./ui/types";
import { usePathname } from "next/navigation";
import React from "react";

import { computeActiveNavItems } from "./computeActive";

export function HeaderClient(props: IHeaderProps) {
  const pathname = usePathname();
  const navItems = computeActiveNavItems(props.navItems, pathname);

  return <HeaderUI {...props} navItems={navItems} />;
}
