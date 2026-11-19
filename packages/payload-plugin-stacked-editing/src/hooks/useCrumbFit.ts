"use client";

import { useRef, useState } from "react";

import { fitCrumbs } from "../lib/breadcrumbs.js";
import type { Crumb, CrumbFit } from "../lib/breadcrumbs.js";
import { useIsomorphicLayoutEffect } from "./useIsomorphicLayoutEffect.js";

const showAll = (crumbs: readonly Crumb[]): CrumbFit => ({
  visible: crumbs.map((_, index) => index),
  hidden: [],
});

const sameVisible = (a: CrumbFit, b: CrumbFit) => a.visible.join(",") === b.visible.join(",");

export const useCrumbFit = (crumbs: readonly Crumb[]) => {
  const navRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLOListElement>(null);
  const ellipsisMeasureRef = useRef<HTMLLIElement>(null);
  const [fit, setFit] = useState<CrumbFit>(() => showAll(crumbs));
  const labels = crumbs.map((crumb) => crumb.label).join("\u0000");

  useIsomorphicLayoutEffect(() => {
    const nav = navRef.current;
    const measure = () => {
      const items = measureRef.current?.children;
      if (!nav || !items) {
        return;
      }
      const ellipsis = ellipsisMeasureRef.current;
      const widths = [...items]
        .filter((item) => item !== ellipsis)
        .map((item) => item.getBoundingClientRect().width);
      const next = fitCrumbs({
        available: nav.clientWidth,
        ellipsisWidth: ellipsis?.getBoundingClientRect().width ?? 0,
        widths,
      });
      setFit((previous) => (sameVisible(previous, next) ? previous : next));
    };
    measure();
    if (!nav) {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [labels]);

  return { fit, navRef, measureRef, ellipsisMeasureRef };
};
