"use client";

import { Drawer, RenderFields, XIcon, useModal } from "@payloadcms/ui";
import { useEffect, useRef } from "react";

import { buildBreadcrumbs } from "../lib/breadcrumbs.js";
import type { CrumbLevel, Translate } from "../lib/breadcrumbs.js";
import type { DefaultMode } from "../lib/headerClick.js";
import type { RowLevel } from "../lib/resolveRowChain.js";
import { Breadcrumbs } from "./Breadcrumbs.js";
import { MODE_ATTRIBUTE, OWNER_ATTRIBUTE } from "./styles.js";

const BASE = "stacked-editing";

type PanelProps = {
  readonly confined: boolean;
  readonly depth: number;
  readonly levels: readonly RowLevel[];
  readonly mode: DefaultMode;
  readonly crumbLevels: readonly CrumbLevel[];
  readonly documentTitle: string;
  readonly ownerId: string;
  readonly translate: Translate;
  readonly onNavigate: (keep: number) => void;
};

export const Panel = ({
  confined,
  crumbLevels,
  depth,
  documentTitle,
  levels,
  mode,
  onNavigate,
  ownerId,
  translate,
}: PanelProps) => {
  const level = levels[depth];
  const slug = `stacked-editing-${ownerId}-${depth}`;
  const { closeModal, modalState, openModal } = useModal();
  const isOpen = Boolean(modalState[slug]?.isOpen);
  const hasOpened = useRef(false);
  const navigateRef = useRef(onNavigate);
  navigateRef.current = onNavigate;

  // One frame later than the parent, so Escape (closes the latest `openedOn`) closes the top panel.
  useEffect(() => {
    const frame = requestAnimationFrame(() => openModal(slug));
    return () => {
      cancelAnimationFrame(frame);
      closeModal(slug);
    };
  }, [closeModal, openModal, slug]);

  useEffect(() => {
    const closedByDrawer = !isOpen && hasOpened.current;
    if (isOpen) {
      hasOpened.current = true;
    } else if (closedByDrawer) {
      hasOpened.current = false;
      navigateRef.current(depth);
    }
  }, [depth, isOpen]);

  if (!level) {
    return null;
  }

  const crumbs = buildBreadcrumbs({ documentTitle, levels: crumbLevels, depth });
  const kind = level.block
    ? translate(level.block.labels?.singular) || level.block.slug
    : translate(level.field.labels?.singular);
  const title = crumbLevels[depth]?.rowLabel ?? "";

  const header = (
    <div className={`${BASE}__header`}>
      <Breadcrumbs crumbs={crumbs} onNavigate={onNavigate} />
      <div className={`${BASE}__title-row`}>
        <h2 className={`${BASE}__title`} title={title}>
          {kind && !title.startsWith(kind) ? <span className={`${BASE}__kind`}>{kind}</span> : null}
          {title}
        </h2>
        <button
          aria-label="Close"
          className={`${BASE}__close`}
          onClick={() => closeModal(slug)}
          type="button"
        >
          <XIcon />
        </button>
      </div>
    </div>
  );

  return (
    <Drawer
      className={[`${BASE}__drawer`, confined && `${BASE}__drawer--confined`]
        .filter(Boolean)
        .join(" ")}
      Header={header}
      slug={slug}
    >
      <div
        className={`${BASE}__body`}
        key={level.rowPath}
        {...{ [MODE_ATTRIBUTE]: mode, [OWNER_ATTRIBUTE]: ownerId }}
      >
        <RenderFields
          fields={level.fields}
          forceRender
          margins="small"
          parentIndexPath=""
          parentPath={level.rowPath}
          parentSchemaPath={level.schemaPath}
          permissions={level.permissions}
          readOnly={level.readOnly}
        />
      </div>
      {depth + 1 < levels.length ? (
        <Panel
          confined={confined}
          crumbLevels={crumbLevels}
          depth={depth + 1}
          documentTitle={documentTitle}
          levels={levels}
          mode={mode}
          onNavigate={onNavigate}
          ownerId={ownerId}
          translate={translate}
        />
      ) : null}
    </Drawer>
  );
};
