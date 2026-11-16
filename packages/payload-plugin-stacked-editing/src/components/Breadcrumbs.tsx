"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { fitCrumbs } from "../lib/breadcrumbs.js";
import type { Crumb, CrumbFit } from "../lib/breadcrumbs.js";

const BASE = "stacked-editing";
const OPEN_DELAY_MS = 150;
const CLOSE_DELAY_MS = 250;

const useIsomorphicLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const CrumbContent = ({
  crumb,
  onNavigate,
}: {
  crumb: Crumb;
  onNavigate: (keep: number) => void;
}) =>
  crumb.current ? (
    <span aria-current="page" className={`${BASE}__crumb-current`} title={crumb.label}>
      {crumb.label}
    </span>
  ) : (
    <button
      className={`${BASE}__crumb-button`}
      onClick={() => onNavigate(crumb.keep)}
      title={crumb.label}
      type="button"
    >
      {crumb.label}
    </button>
  );

/**
 * One line of breadcrumbs that folds its middle into a "…" menu when it does not fit. Widths come
 * from an invisible copy of the full trail, so the decision follows the real labels and fonts and
 * the visible row never wraps or shifts.
 */
export const Breadcrumbs = ({
  crumbs,
  onNavigate,
}: {
  crumbs: readonly Crumb[];
  onNavigate: (keep: number) => void;
}) => {
  const navRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLOListElement>(null);
  const ellipsisMeasureRef = useRef<HTMLLIElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const timer = useRef(0);
  const menuId = useId();
  const [fit, setFit] = useState<CrumbFit>(() => ({
    visible: crumbs.map((_, index) => index),
    hidden: [],
  }));
  const [open, setOpen] = useState(false);
  const labels = crumbs.map((crumb) => crumb.label).join("\u0000");

  useIsomorphicLayoutEffect(() => {
    const nav = navRef.current;
    const measure = () => {
      const items = measureRef.current?.children;
      if (!nav || !items) {
        return;
      }
      const widths = [...items]
        .filter((item) => item !== ellipsisMeasureRef.current)
        .map((item) => item.getBoundingClientRect().width);
      const next = fitCrumbs({
        available: nav.clientWidth,
        ellipsisWidth: ellipsisMeasureRef.current?.getBoundingClientRect().width ?? 0,
        widths,
      });
      setFit((previous) =>
        previous.visible.join(",") === next.visible.join(",") ? previous : next
      );
    };
    measure();
    if (!nav) {
      return;
    }
    const observer = new ResizeObserver(measure);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [labels]);

  const hidden = fit.hidden.map((index) => crumbs[index]).filter((crumb) => crumb !== undefined);

  useEffect(() => {
    if (hidden.length === 0) {
      setOpen(false);
    }
  }, [hidden.length]);

  const schedule = useCallback((next: boolean, delay: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), delay);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // While the menu is open: Escape closes the menu (and not the panel); a click outside closes it.
  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !toggleRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  const navigate = (keep: number) => {
    setOpen(false);
    onNavigate(keep);
  };

  const firstHiddenLevel = hidden[0]?.level ?? 0;

  return (
    <nav aria-label="Breadcrumbs" className={`${BASE}__breadcrumbs`} ref={navRef}>
      <ol className={`${BASE}__crumbs`}>
        {fit.visible.map((index, position) => {
          const crumb = crumbs[index];
          if (!crumb) {
            return null;
          }
          return [
            <li
              className={[
                `${BASE}__crumb`,
                `${BASE}__crumb--${crumb.kind}`,
                crumb.current && `${BASE}__crumb--is-current`,
              ]
                .filter(Boolean)
                .join(" ")}
              key={crumb.key}
            >
              <CrumbContent crumb={crumb} onNavigate={navigate} />
            </li>,
            position === 0 && hidden.length > 0 ? (
              <li
                className={`${BASE}__crumb ${BASE}__crumb--more`}
                key="more"
                onMouseEnter={() => schedule(true, OPEN_DELAY_MS)}
                onMouseLeave={() => schedule(false, CLOSE_DELAY_MS)}
              >
                <button
                  aria-controls={menuId}
                  aria-expanded={open}
                  aria-haspopup="menu"
                  aria-label="Show hidden levels"
                  className={`${BASE}__crumb-button ${BASE}__crumb-more`}
                  onClick={() => {
                    window.clearTimeout(timer.current);
                    setOpen((previous) => !previous);
                  }}
                  ref={toggleRef}
                  type="button"
                >
                  …
                </button>
              </li>
            ) : null,
          ];
        })}
      </ol>
      {open && hidden.length > 0 ? (
        <div
          className={`${BASE}__menu`}
          id={menuId}
          onMouseEnter={() => schedule(true, 0)}
          onMouseLeave={() => schedule(false, CLOSE_DELAY_MS)}
          ref={menuRef}
          role="menu"
          style={{ left: toggleRef.current?.parentElement?.offsetLeft ?? 0 }}
        >
          {hidden.map((crumb) => (
            <button
              className={`${BASE}__menu-item ${BASE}__menu-item--${crumb.kind}`}
              key={crumb.key}
              onClick={() => navigate(crumb.keep)}
              role="menuitem"
              style={{ paddingInlineStart: `${12 + (crumb.level - firstHiddenLevel) * 12}px` }}
              type="button"
            >
              <span className={`${BASE}__menu-label`}>{crumb.label}</span>
              {crumb.hint ? <span className={`${BASE}__menu-hint`}>{crumb.hint}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      {/* Invisible full trail: what the fit is measured from. */}
      <ol aria-hidden className={`${BASE}__crumbs ${BASE}__crumbs--measure`} ref={measureRef}>
        {crumbs.map((crumb) => (
          <li className={`${BASE}__crumb ${BASE}__crumb--${crumb.kind}`} key={crumb.key}>
            <span className={crumb.current ? `${BASE}__crumb-current` : `${BASE}__crumb-button`}>
              {crumb.label}
            </span>
          </li>
        ))}
        <li className={`${BASE}__crumb ${BASE}__crumb--more`} ref={ellipsisMeasureRef}>
          <span className={`${BASE}__crumb-button ${BASE}__crumb-more`}>…</span>
        </li>
      </ol>
    </nav>
  );
};
