"use client";

import { useId } from "react";
import type { RefObject } from "react";

import { useCrumbFit } from "../hooks/useCrumbFit.js";
import { useHiddenLevelsMenu } from "../hooks/useHiddenLevelsMenu.js";
import type { Crumb } from "../lib/breadcrumbs.js";

const BASE = "stacked-editing";
const MENU_INDENT_PX = 12;

const crumbClassName = (crumb: Crumb) =>
  [`${BASE}__crumb`, `${BASE}__crumb--${crumb.kind}`, crumb.current && `${BASE}__crumb--is-current`]
    .filter(Boolean)
    .join(" ");

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

const HiddenLevelsMenu = ({
  crumbs,
  id,
  menu,
  onNavigate,
}: {
  crumbs: Crumb[];
  id: string;
  menu: ReturnType<typeof useHiddenLevelsMenu>;
  onNavigate: (keep: number) => void;
}) => {
  const firstLevel = crumbs[0]?.level ?? 0;
  return (
    <div
      className={`${BASE}__menu`}
      id={id}
      onMouseEnter={menu.hoverKeepOpen}
      onMouseLeave={menu.hoverClose}
      ref={menu.menuRef}
      role="menu"
      style={{ left: menu.toggleRef.current?.parentElement?.offsetLeft ?? 0 }}
    >
      {crumbs.map((crumb) => (
        <button
          className={`${BASE}__menu-item ${BASE}__menu-item--${crumb.kind}`}
          key={crumb.key}
          onClick={() => onNavigate(crumb.keep)}
          role="menuitem"
          style={{ paddingInlineStart: `${MENU_INDENT_PX * (1 + crumb.level - firstLevel)}px` }}
          type="button"
        >
          <span className={`${BASE}__menu-label`}>{crumb.label}</span>
          {crumb.hint ? <span className={`${BASE}__menu-hint`}>{crumb.hint}</span> : null}
        </button>
      ))}
    </div>
  );
};

const MoreCrumb = ({
  menu,
  menuId,
}: {
  menu: ReturnType<typeof useHiddenLevelsMenu>;
  menuId: string;
}) => (
  <li
    className={`${BASE}__crumb ${BASE}__crumb--more`}
    onMouseEnter={menu.hoverOpen}
    onMouseLeave={menu.hoverClose}
  >
    <button
      aria-controls={menuId}
      aria-expanded={menu.isOpen}
      aria-haspopup="menu"
      aria-label="Show hidden levels"
      className={`${BASE}__crumb-button ${BASE}__crumb-more`}
      onClick={menu.toggle}
      ref={menu.toggleRef}
      type="button"
    >
      …
    </button>
  </li>
);

const MeasuringTrail = ({
  crumbs,
  ellipsisRef,
  listRef,
}: {
  crumbs: readonly Crumb[];
  ellipsisRef: RefObject<HTMLLIElement | null>;
  listRef: RefObject<HTMLOListElement | null>;
}) => (
  <ol aria-hidden className={`${BASE}__crumbs ${BASE}__crumbs--measure`} ref={listRef}>
    {crumbs.map((crumb) => (
      <li className={`${BASE}__crumb ${BASE}__crumb--${crumb.kind}`} key={crumb.key}>
        <span className={crumb.current ? `${BASE}__crumb-current` : `${BASE}__crumb-button`}>
          {crumb.label}
        </span>
      </li>
    ))}
    <li className={`${BASE}__crumb ${BASE}__crumb--more`} ref={ellipsisRef}>
      <span className={`${BASE}__crumb-button ${BASE}__crumb-more`}>…</span>
    </li>
  </ol>
);

export const Breadcrumbs = ({
  crumbs,
  onNavigate,
}: {
  crumbs: readonly Crumb[];
  onNavigate: (keep: number) => void;
}) => {
  const { fit, navRef, measureRef, ellipsisMeasureRef } = useCrumbFit(crumbs);
  const hidden = fit.hidden.map((index) => crumbs[index]).filter((crumb) => crumb !== undefined);
  const menu = useHiddenLevelsMenu(hidden.length > 0);
  const menuId = useId();

  const navigate = (keep: number) => {
    menu.close();
    onNavigate(keep);
  };

  const visible = fit.visible.map((index) => crumbs[index]).filter((crumb) => crumb !== undefined);

  return (
    <nav aria-label="Breadcrumbs" className={`${BASE}__breadcrumbs`} ref={navRef}>
      <ol className={`${BASE}__crumbs`}>
        {visible.map((crumb, position) => [
          <li className={crumbClassName(crumb)} key={crumb.key}>
            <CrumbContent crumb={crumb} onNavigate={navigate} />
          </li>,
          position === 0 && hidden.length > 0 ? (
            <MoreCrumb key="more" menu={menu} menuId={menuId} />
          ) : null,
        ])}
      </ol>
      {menu.isOpen && hidden.length > 0 ? (
        <HiddenLevelsMenu crumbs={hidden} id={menuId} menu={menu} onNavigate={navigate} />
      ) : null}
      <MeasuringTrail crumbs={crumbs} ellipsisRef={ellipsisMeasureRef} listRef={measureRef} />
    </nav>
  );
};
